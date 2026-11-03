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

  // Subscription lifecycle events are authoritative for entitlement projection.
  // Checkout and invoice events can omit a subscription ID; do not retry them indefinitely.
  if (!/^evt_[A-Za-z0-9]+$/.test(event.id)) return response('Invalid Stripe event identifier', 400);

  const relevant = event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted';
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
  if (!subscriptionId || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) return response('Subscription identifier unavailable', 503);
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
      if (s.id !== subscriptionId || s.livemode !== false) return response('Stripe subscription mismatch', 503);
      if (customerId && s.customer !== customerId) return response('Stripe customer mismatch', 503);
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
      // Restrict entitlement grants to the configured Canadian recurring prices.
      const priceCurrency = price && typeof price === 'object' && 'currency' in price ? price.currency : null;
      const priceRecurring = price && typeof price === 'object' && 'recurring' in price ? price.recurring : null;
      if (priceCurrency !== 'cad' || !priceRecurring || typeof priceRecurring !== 'object')
        return response('Unsupported subscription price', 503);
      const expectedInterval = priceId === process.env.STRIPE_PRICE_MONTHLY_CAD ? 'month' :
        priceId === process.env.STRIPE_PRICE_ANNUAL_CAD ? 'year' : null;
      if (!expectedInterval || !('interval' in priceRecurring) ||
        priceRecurring.interval !== expectedInterval) return response('Unexpected billing interval', 503);
      const periodEnd = firstItem && typeof firstItem === 'object' &&
        'current_period_end' in firstItem ? firstItem.current_period_end : null;
      const expires = typeof periodEnd === 'number' && Number.isSafeInteger(periodEnd) && periodEnd > 0 && periodEnd < 8640000000000
        ? new Date(periodEnd * 1000).toISOString() : null;
      if ((status === 'active' || status === 'trialing') && !expires) return response('Subscription period unavailable', 503);
      if (!priceId || ![process.env.STRIPE_PRICE_MONTHLY_CAD, process.env.STRIPE_PRICE_ANNUAL_CAD].includes(priceId))
        return response('Unknown subscription price', 503);
      // Never allow an existing Stripe subscription to be reassigned to a different user.
      const existingEndpoint = new URL('/rest/v1/cart_snag_stripe_subscriptions', dbOrigin);
      existingEndpoint.searchParams.set('select', 'user_id,stripe_customer_id');
      existingEndpoint.searchParams.set('stripe_subscription_id', 'eq.' + subscriptionId);
      const existingResponse = await fetch(existingEndpoint, {
        headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (!existingResponse.ok) return response('Subscription ownership verification failed', 503);
      const existingRows: unknown = await existingResponse.json();
      if (!Array.isArray(existingRows) || existingRows.length > 1) return response('Invalid ownership record', 503);
      const existing = existingRows[0];
      if (existing && (typeof existing !== 'object' ||
        !('user_id' in existing) || existing.user_id !== owner ||
        !('stripe_customer_id' in existing) || existing.stripe_customer_id !== customer))
        return response('Subscription ownership conflict', 409);
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
