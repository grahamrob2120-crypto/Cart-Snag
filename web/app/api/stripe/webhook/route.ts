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

  // Durable event journal is in place, but membership projection is not.
  // Stripe must retry these events until the entitlement processor is deployed.
  return response('Membership processing pending', 503);
}
