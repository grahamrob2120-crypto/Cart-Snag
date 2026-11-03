import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest) {
  const bearer = request.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ') || bearer.length > 4096) return fail('Sign in required', 401);
  const origin = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripe = process.env.STRIPE_SECRET_KEY;
  const appOrigin = process.env.PUBLIC_APP_ORIGIN;
  if (!origin || !anon || !service || !stripe?.startsWith('sk_test_') || !appOrigin) return fail('Billing portal unavailable', 503);
  let returnUrl: string;
  try {
    const parsed = new URL(appOrigin);
    if (parsed.protocol !== 'https:' || parsed.origin !== appOrigin) return fail('Billing portal unavailable', 503);
    returnUrl = parsed.origin + '/';
  } catch {
    return fail('Billing portal unavailable', 503);
  }
  try {
    const identity = await fetch(new URL('/auth/v1/user', origin), {
      headers: { apikey: anon, authorization: bearer },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!identity.ok) return fail('Sign in required', 401);
    const user: unknown = await identity.json();
    if (!user || typeof user !== 'object' || !('id' in user) ||
      typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id)) return fail('Invalid session', 401);

    const endpoint = new URL('/rest/v1/cart_snag_stripe_subscriptions', origin);
    endpoint.searchParams.set('select', 'stripe_customer_id,status');
    endpoint.searchParams.set('user_id', 'eq.' + user.id);
    endpoint.searchParams.set('status', 'in.(active,trialing,past_due,unpaid,paused,incomplete)');
    endpoint.searchParams.set('limit', '100');
    const records = await fetch(endpoint, {
      headers: { apikey: service, authorization: 'Bearer ' + service },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!records.ok) return fail('Billing records unavailable', 503);
    const rows: unknown = await records.json();
    if (!Array.isArray(rows)) return fail('Billing records unavailable', 503);
    const customers = [...new Set(rows.flatMap((row: unknown) => {
      if (!row || typeof row !== 'object' || !('stripe_customer_id' in row) ||
        typeof row.stripe_customer_id !== 'string' || !/^cus_[A-Za-z0-9]+$/.test(row.stripe_customer_id)) return [];
      return [row.stripe_customer_id];
    }))];
    if (customers.length !== 1) return fail('Billing account requires support', 409);

    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + stripe, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer: customers[0], return_url: returnUrl }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return fail('Billing portal temporarily unavailable', 502);
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || !('url' in result) || typeof result.url !== 'string') return fail('Invalid billing portal response', 502);
    const destination = new URL(result.url);
    if (destination.protocol !== 'https:' || destination.hostname !== 'billing.stripe.com') return fail('Invalid billing portal destination', 502);
    return NextResponse.json({ url: destination.href }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('Billing portal temporarily unavailable', 503);
  }
}
