import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Country = 'CA' | 'US';
const plans: Record<Country, { currency: string; amount: string; planEnv: string }> = {
  CA: { currency: 'CAD', amount: '0.99', planEnv: 'PAYPAL_PLAN_ID_CA' },
  US: { currency: 'USD', amount: '1.19', planEnv: 'PAYPAL_PLAN_ID_US' },
};

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function paypalBase() {
  const mode = process.env.PAYPAL_ENVIRONMENT;
  if (mode === 'sandbox') return 'https://api-m.sandbox.paypal.com';
  if (mode === 'live') return 'https://api-m.paypal.com';
  throw new Error('PayPal environment is not configured');
}

async function accessToken(base: string): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal credentials are not configured');
  const credentials = Buffer.from(id + ':' + secret).toString('base64');
  const response = await fetch(base + '/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + credentials, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('PayPal authentication failed');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !('access_token' in data) || typeof data.access_token !== 'string') throw new Error('Invalid PayPal authentication response');
  return data.access_token;
}

export async function POST(request: NextRequest) {
  // No anonymous paid subscriptions: user identity must be verified before checkout.
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ') || auth.length > 4096) return error('Sign in before subscribing', 401);
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return error('Membership authentication is not configured', 503);
  let userId: string;
  try {
    const userResponse = await fetch(new URL('/auth/v1/user', supabaseUrl), {
      headers: { apikey: supabaseAnonKey, Authorization: auth },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!userResponse.ok) return error('Invalid or expired session', 401);
    const user: unknown = await userResponse.json();
    if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id)) return error('Invalid session', 401);
    userId = user.id;
  } catch {
    return error('Membership authentication is temporarily unavailable', 503);
  }

  let country: Country;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || !('country' in body) || (body.country !== 'CA' && body.country !== 'US')) return error('Country must be CA or US', 400);
    country = body.country;
  } catch {
    return error('Invalid request body', 400);
  }

  const planId = process.env[plans[country].planEnv];
  if (!planId) return error('Subscription plan is not configured', 503);
  const origin = process.env.PUBLIC_APP_ORIGIN;
  if (!origin) return error('Checkout return origin is not configured', 503);
  let appOrigin: string;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:' || parsed.origin !== origin) throw new Error('Invalid origin');
    appOrigin = parsed.origin;
  } catch {
    return error('Checkout return origin is invalid', 503);
  }
  try {
    const base = paypalBase();
    const token = await accessToken(base);
    const response = await fetch(base + '/v1/billing/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'PayPal-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: userId,
        application_context: {
          brand_name: 'Cart Snag',
          user_action: 'SUBSCRIBE_NOW',
          return_url: appOrigin + '/membership/return',
          cancel_url: appOrigin + '/membership/cancel',
        },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return error('PayPal could not create the subscription', 502);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('id' in data) || typeof data.id !== 'string' || !('links' in data) || !Array.isArray(data.links)) return error('Unexpected PayPal response', 502);
    const approve = data.links.find((link: unknown) => link && typeof link === 'object' && 'rel' in link && link.rel === 'approve' && 'href' in link && typeof link.href === 'string');
    if (!approve || !('href' in approve) || typeof approve.href !== 'string') return error('PayPal approval link missing', 502);
    const approveUrl = new URL(approve.href);
    if (approveUrl.protocol !== 'https:' || !(approveUrl.hostname === 'paypal.com' || approveUrl.hostname.endsWith('.paypal.com'))) return error('Invalid PayPal approval destination', 502);
    return NextResponse.json({ subscriptionId: data.id, approveUrl: approveUrl.href, country, currency: plans[country].currency, amount: plans[country].amount }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return error('Subscription service is temporarily unavailable', 503);
  }
}
