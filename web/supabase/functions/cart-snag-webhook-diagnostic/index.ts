Deno.serve(async (request: Request) => {
  if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
  const base = Deno.env.get("SUPABASE_URL");
  if (!base) return Response.json({ error: "Supabase URL unavailable" }, { status: 503 });
  const endpoint = new URL("/functions/v1/cart-snag-paypal-webhook", base);
  const cases: Array<{ name: string; init: RequestInit }> = [
    { name: "GET rejected", init: { method: "GET" } },
    { name: "empty POST rejected", init: { method: "POST", body: "" } },
    { name: "unsigned POST rejected", init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "no-charge-diagnostic", event_type: "BILLING.SUBSCRIPTION.ACTIVATED", resource: { id: "not-a-real-subscription" } }) } }
  ];
  const results = [];
  for (const test of cases) {
    try {
      const response = await fetch(endpoint, { ...test.init, signal: AbortSignal.timeout(5000) });
      results.push({ test: test.name, status: response.status, pass: test.name.startsWith("GET") ? response.status === 405 : response.status >= 400 && response.status < 500 });
    } catch (error) {
      results.push({ test: test.name, pass: false, error: String(error).slice(0, 160) });
    }
  }
  return Response.json({ results, passed: results.every((r) => r.pass), paymentRequests: 0 });
});