import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const mode = Deno.env.get("CART_SNAG_PAYPAL_MODE");
  const clientId = Deno.env.get("CART_SNAG_PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("CART_SNAG_PAYPAL_CLIENT_SECRET");
  const webhookId = Deno.env.get("CART_SNAG_PAYPAL_WEBHOOK_ID");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!mode || !["sandbox", "live"].includes(mode) || !clientId || !secret || !webhookId || !url || !key) return json({ error: "Webhook not configured" }, 503);
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const raw = await req.text();
  if (raw.length > 100000) return json({ error: "Payload too large" }, 413);
  let event: Record<string, unknown>;
  try { event = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
  const headers = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id", "paypal-transmission-sig", "paypal-transmission-time"];
  if (headers.some(h => !req.headers.get(h))) return json({ error: "Missing signature headers" }, 401);
  try {
    const basic = btoa(clientId + ":" + secret);
    const tokenResp = await fetch(base + "/v1/oauth2/token", { method: "POST", headers: { authorization: "Basic " + basic, "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
    if (!tokenResp.ok) return json({ error: "PayPal authentication unavailable" }, 503);
    const token = (await tokenResp.json()).access_token;
    const verification = await fetch(base + "/v1/notifications/verify-webhook-signature", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({
      auth_algo: req.headers.get("paypal-auth-algo"), cert_url: req.headers.get("paypal-cert-url"), transmission_id: req.headers.get("paypal-transmission-id"), transmission_sig: req.headers.get("paypal-transmission-sig"), transmission_time: req.headers.get("paypal-transmission-time"), webhook_id: webhookId, webhook_event: event
    }) });
    if (!verification.ok || (await verification.json()).verification_status !== "SUCCESS") return json({ error: "Signature verification failed" }, 401);
    const id = event.id, type = event.event_type;
    if (typeof id !== "string" || typeof type !== "string" || id.length > 200) return json({ error: "Invalid event" }, 400);
    const resource = event.resource as Record<string, unknown> | undefined;
    const subscriptionId = typeof resource?.id === "string" && type.startsWith("BILLING.SUBSCRIPTION.") ? resource.id : typeof resource?.billing_agreement_id === "string" ? resource.billing_agreement_id : null;
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { error: insertError } = await db.from("cart_snag_paypal_events").insert({ id, environment: mode, event_type: type, subscription_id: subscriptionId });
    if (insertError) {
      if (insertError.code === "23505") {
        const { data: prior, error: priorError } = await db.from("cart_snag_paypal_events").select("processed_at").eq("id", id).eq("environment", mode).maybeSingle();
        if (priorError) return json({ error: "Event lookup failed" }, 500);
        if (prior?.processed_at) return json({ received: true, duplicate: true });
      } else return json({ error: "Event persistence failed" }, 500);
    }
    // Never grant access based solely on an unsolicited webhook. The checkout flow
    // must first securely bind a verified PayPal subscription to an authenticated user.
    if (subscriptionId) {
      const { data: membership, error: lookupError } = await db.from("cart_snag_subscriptions")
        .select("id,status,paypal_plan_id").eq("paypal_subscription_id", subscriptionId).eq("environment", mode).maybeSingle();
      if (lookupError) return json({ error: "Membership lookup failed" }, 500);
      if (!membership) return json({ error: "Subscription has no linked customer" }, 409);
      let status: string | null = null;
      let periodEnd: string | null = null;
      if (type === "BILLING.SUBSCRIPTION.CANCELLED") status = "cancelled";
      if (type === "BILLING.SUBSCRIPTION.SUSPENDED") status = "suspended";
      if (type === "BILLING.SUBSCRIPTION.EXPIRED") status = "expired";
      if (type === "PAYMENT.SALE.COMPLETED") {
        const saleId = typeof resource?.id === "string" ? resource.id : null;
        if (!saleId) return json({ error: "Missing sale ID" }, 400);
        const saleResponse = await fetch(base + "/v1/payments/sale/" + encodeURIComponent(saleId), {
          headers: { authorization: "Bearer " + token }, signal: AbortSignal.timeout(10000)
        });
        if (!saleResponse.ok) return json({ error: "Payment verification unavailable" }, 503);
        const sale = await saleResponse.json();
        if (sale.state !== "completed" || sale.billing_agreement_id !== subscriptionId)
          return json({ error: "Payment not confirmed for this subscription" }, 409);
        const subResponse = await fetch(base + "/v1/billing/subscriptions/" + encodeURIComponent(subscriptionId), {
          headers: { authorization: "Bearer " + token }, signal: AbortSignal.timeout(10000)
        });
        if (!subResponse.ok) return json({ error: "Subscription verification unavailable" }, 503);
        const sub = await subResponse.json();
        if (sub.status !== "ACTIVE" || sub.plan_id !== membership.paypal_plan_id)
          return json({ error: "Subscription or plan mismatch" }, 409);
        const nextBilling = sub.billing_info?.next_billing_time;
        if (typeof nextBilling !== "string" || !Number.isFinite(Date.parse(nextBilling)) || Date.parse(nextBilling) <= Date.now())
          return json({ error: "Subscription billing period cannot be verified" }, 409);
        periodEnd = nextBilling;
        if (!["cancelled", "expired"].includes(membership.status)) status = "active";
      }
      if (status) {
        const { data: updated, error: changeError } = await db.from("cart_snag_subscriptions")
          .update({ status, ...(periodEnd ? { current_period_end: periodEnd } : {}), updated_at: new Date().toISOString() }).eq("id", membership.id)
          .eq("environment", mode).select("id");
        if (changeError || updated?.length !== 1) return json({ error: "Membership update not confirmed" }, 500);
      }
    }
    const { error: updateError } = await db.from("cart_snag_paypal_events").update({ processed_at: new Date().toISOString() }).eq("id", id).eq("environment", mode);
    if (updateError) return json({ error: "Event processing failed" }, 500);
    return json({ received: true });
  } catch { return json({ error: "Webhook processing temporarily unavailable" }, 503); }
});