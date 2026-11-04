import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const origin = Deno.env.get("APP_ORIGIN");
  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!origin || !secret || !supabaseUrl || !anonKey) return json({ error: "Billing unavailable" }, 503);
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);
  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await supabase.auth.getUser(auth.slice(7));
  if (error || !user?.email) return json({ error: "Invalid session" }, 401);
  let request: { plan?: string; country?: string };
  try { request = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const key = `${request.country === "CA" ? "CA" : request.country === "US" ? "US" : ""}_${request.plan === "monthly" ? "MONTHLY" : request.plan === "annual" ? "ANNUAL" : ""}`;
  if (!/^(CA|US)_(MONTHLY|ANNUAL)$/.test(key)) return json({ error: "Invalid plan or country" }, 400);
  const price = Deno.env.get(`STRIPE_PRICE_${key}`);
  if (!price) return json({ error: "Plan not configured" }, 503);
  try {
    const stripe = new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      allow_promotion_codes: false,
    });
    if (!session.url) return json({ error: "Checkout unavailable" }, 502);
    return json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout failed", e instanceof Error ? e.message : "unknown error");
    return json({ error: "Unable to create checkout" }, 502);
  }
});
