import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  // Fail closed until webhook-driven membership provisioning is deployed and tested.
  if (process.env.CART_SNAG_STRIPE_CHECKOUT_ENABLED !== 'true') return fail('Stripe checkout is not enabled', 503);
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail('Subscription verification is not configured', 503);

  const bearer = request.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ') || bearer.length > 4096) return fail('Sign in required', 401);
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !anonKey || !secretKey) return fail('Checkout is not configured', 503);
  if (!secretKey.startsWith('sk_test_')) return fail('Only sandbox checkout is enabled', 503);

  let userId: string;
  try {
    const response = await fetch(new URL('/auth/v1/user', supabaseUrl), {
      headers: { apikey: anonKey, authorization: bearer },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return fail('Session expired', 401);
    const user: unknown = await response.json();
    if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id)) return fail('Invalid session', 401);
    userId = user.id;
  } catch {
    return fail('Authentication service unavailable', 503);
  }

  let plan: 'monthly' | 'annual';
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || !('country' in body) || body.country !== 'CA' || !('plan' in body) || (body.plan !== 'monthly' && body.plan !== 'annual')) return fail('Only configured Canadian plans are supported', 400);
    plan = body.plan;
  } catch {
    return fail('Invalid request', 400);
  }

  const price = plan === 'monthly' ? process.env.STRIPE_PRICE_MONTHLY_CAD : process.env.STRIPE_PRICE_ANNUAL_CAD;
  const origin = process.env.PUBLIC_APP_ORIGIN;
  if (!price || !/^price_[a-zA-Z0-9]+$/.test(price) || !origin) return fail('Price or return URL is not configured', 503);
  let parsed: URL;
  try {
    parsed = new URL(origin);
    if (parsed.protocol !== 'https:' || parsed.origin !== origin) return fail('Invalid return URL', 503);
  } catch {
    return fail('Invalid return URL', 503);
  }

  const payload = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: userId,
    'subscription_data[metadata][cart_snag_user_id]': userId,
    success_url: parsed.origin + '/membership/return?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: parsed.origin + '/membership/cancel',
  });
  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secretKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': 'cart-snag-' + crypto.randomUUID(),
      },
      body: payload,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return fail('Stripe could not start checkout', 502);
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('url' in result) || typeof result.url !== 'string') return fail('Invalid Stripe response', 502);
    const url = new URL(result.url);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') return fail('Invalid checkout destination', 502);
    return NextResponse.json({ url: url.href }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('Checkout temporarily unavailable', 503);
  }
}
