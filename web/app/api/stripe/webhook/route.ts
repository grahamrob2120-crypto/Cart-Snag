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

  // Never acknowledge subscription events before durable idempotent persistence is implemented.
  // Returning 503 makes Stripe retry delivery; no paid access is granted.
  if (event.type.startsWith('customer.subscription.') ||
      event.type.startsWith('checkout.session.') ||
      event.type.startsWith('invoice.')) return response('Membership synchronization not configured', 503);

  return NextResponse.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } });
}
