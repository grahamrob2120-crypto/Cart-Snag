import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Fail-closed checkout configuration endpoint.
 * Never expose Stripe secret keys or activate billing without verified webhooks.
 */
export async function GET() {
  const configured = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRICE_MONTHLY_CAD &&
    process.env.STRIPE_PRICE_ANNUAL_CAD
  );
  return NextResponse.json(
    { provider: 'stripe', configured, liveCheckoutEnabled: false },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
