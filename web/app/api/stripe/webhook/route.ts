import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const response = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

function verifySignature(payload: string, header: string, secret: string): boolean {
  const parts = header.split(',').map((entry) => entry.trim());
  const timestamp = parts.find((entry) => /^t=\d+$/.test(entry))?.slice(2);
  const signatures = parts.filter((entry) => /^v1=[0-9a-f]{64}$/i.test(entry)).map((entry) => entry.slice(3));
  if (!timestamp || !signatures.length) return false;
  const time = Number(timestamp);
  if (!Number.isSafeInteger(time) || Math.abs(Math.floor(Date.now() / 1000) - time) > 300) return false;
  const expected = createHmac('sha256', secret).update(timestamp + '.' + payload).digest();
  return signatures.some((candidate) => {
    const actual = Buffer.from(candidate, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return response('Webhook verification unavailable', 503);
  const size = Number(request.headers.get('content-length') ?? 0);
  if (size > 65536) return response('Payload too large', 413);
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return response('Invalid request body', 400);
  }
  if (Buffer.byteLength(raw, 'utf8') > 65536) return response('Payload too large', 413);
  if (!verifySignature(raw, signature, secret)) return response('Invalid webhook signature', 400);

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return response('Invalid event', 400);
  }
  if (!event || typeof event !== 'object' || !('id' in event) || typeof event.id !== 'string' ||
      !('type' in event) || typeof event.type !== 'string' ||
      !('livemode' in event) || event.livemode !== false) return response('Invalid sandbox event', 400);

  const relevant = event.type.startsWith('customer.subscription.') ||
    event.type.startsWith('checkout.session.') ||
    event.type.startsWith('invoice.');
  if (!relevant) return NextResponse.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } });

  const dbOrigin = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dbOrigin || !serviceKey) return response('Event persistence unavailable', 503);

  const data = 'data' in event && event.data && typeof event.data === 'object' &&
    'object' in event.data && event.data.object && typeof event.data.object === 'object'
    ? event.data.object : null;
  const objectId = data && 'id' in data && typeof data.id === 'string' ? data.id : null;
  const subscriptionId = data && 'subscription' in data && typeof data.subscription === 'string'
    ? data.subscription : event.type.startsWith('customer.subscription.') ? objectId : null;
  const customerId = data && 'customer' in data && typeof data.customer === 'string' ? data.customer : null;
  try {
    const endpoint = new URL('/rest/v1/cart_snag_stripe_events?on_conflict=id', dbOrigin);
    const saved = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: event.id,
        event_type: event.type,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        livemode: false,
        payload: event,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!saved.ok) return response('Event persistence failed', 503);
  } catch {
    return response('Event persistence unavailable', 503);
  }

  // Refresh the subscription from Stripe rather than trusting out-of-order webhook payloads.
  if (subscriptionId && /^sub_[A-Za-z0-9]+$/.test(subscriptionId)) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey?.startsWith('sk_test_')) return response('Stripe verification unavailable', 503);
    try {
      const stripe = await fetch('https://api.stripe.com/v1/subscriptions/' + subscriptionId, {
        headers: { Authorization: 'Bearer ' + stripeKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!stripe.ok) return response('Subscription verification failed', 503);
      const subscription: unknown = await stripe.json();
      if (!subscription || typeof subscription !== 'object') return response('Invalid subscription', 503);
      const s = subscription as Record<string, unknown>;
      const metadata = s.metadata;
      const owner = metadata && typeof metadata === 'object' &&
        'cart_snag_user_id' in metadata ? metadata.cart_snag_user_id : null;
      const customer = s.customer;
      const status = s.status;
      if (typeof owner !== 'string' || !/^[0-9a-f-]{36}$/i.test(owner) ||
        typeof customer !== 'string' || !/^cus_[A-Za-z0-9]+$/.test(customer) ||
        typeof status !== 'string') return response('Unlinked subscription', 503);
      const itemData = s.items && typeof s.items === 'object' && 'data' in s.items
        ? s.items.data : null;
      const firstItem = Array.isArray(itemData) ? itemData[0] : null;
      const price = firstItem && typeof firstItem === 'object' && 'price' in firstItem
        ? firstItem.price : null;
      const priceId = price && typeof price === 'object' && 'id' in price &&
        typeof price.id === 'string' ? price.id : null;
      const periodEnd = firstItem && typeof firstItem === 'object' &&
        'current_period_end' in firstItem ? firstItem.current_period_end : null;
      const expires = typeof periodEnd === 'number' && Number.isSafeInteger(periodEnd)
        ? new Date(periodEnd * 1000).toISOString() : null;
      if (!priceId || ![process.env.STRIPE_PRICE_MONTHLY_CAD, process.env.STRIPE_PRICE_ANNUAL_CAD].includes(priceId))
        return response('Unknown subscription price', 503);
      const endpoint = new URL('/rest/v1/cart_snag_stripe_subscriptions?on_conflict=stripe_subscription_id', dbOrigin);
      const saved = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: 'Bearer ' + serviceKey,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customer,
          user_id: owner,
          status,
          price_id: priceId,
          current_period_end: expires,
          cancel_at_period_end: s.cancel_at_period_end === true,
          updated_at: new Date().toISOString(),
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!saved.ok) return response('Subscription synchronization failed', 503);
    } catch {
      return response('Subscription synchronization unavailable', 503);
    }
  }

  const eventEndpoint = new URL('/rest/v1/cart_snag_stripe_events', dbOrigin);
  eventEndpoint.searchParams.set('id', 'eq.' + event.id);
  const processed = await fetch(eventEndpoint, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ processed_at: new Date().toISOString(), processing_error: null }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!processed?.ok) return response('Event processing incomplete', 503);
  return NextResponse.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } });
}
