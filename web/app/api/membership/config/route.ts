import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 });
  return NextResponse.json({ url, anonKey: key, checkoutEnabled: process.env.CART_SNAG_STRIPE_CHECKOUT_ENABLED === 'true' && Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && process.env.STRIPE_PRICE_MONTHLY_CAD && process.env.STRIPE_PRICE_ANNUAL_CAD) }, { headers: { 'Cache-Control': 'no-store' } });
}
