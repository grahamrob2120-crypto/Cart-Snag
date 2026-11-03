import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requiredServerConfiguration = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_PLAN_ID_CA',
  'PAYPAL_PLAN_ID_US',
  'PUBLIC_APP_ORIGIN',
] as const;

export function GET() {
  const configured = requiredServerConfiguration.every((key) =>
    Boolean(process.env[key]?.trim()),
  );
  const checkoutEnabled = process.env.CART_SNAG_CHECKOUT_ENABLED === 'true';
  const environment = process.env.PAYPAL_ENVIRONMENT;
  const billingReady =
    configured &&
    checkoutEnabled &&
    (environment === 'live' || environment === 'sandbox');

  // Public health checks must not disclose individual secret/configuration state.
  // This indicates configuration presence, not payment or database connectivity.
  return NextResponse.json(
    {
      status: 'ok',
      service: 'cart-snag-web',
      billing: { ready: billingReady },
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  );
}
