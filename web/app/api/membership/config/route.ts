import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 });
  return NextResponse.json({ url, anonKey: key, checkoutEnabled: process.env.CART_SNAG_CHECKOUT_ENABLED === 'true' }, { headers: { 'Cache-Control': 'no-store' } });
}
