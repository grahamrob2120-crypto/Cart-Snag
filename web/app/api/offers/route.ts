import { NextRequest, NextResponse } from 'next/server';
import { isFoodGroup } from '../../../lib/catalog';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ')) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const group = request.nextUrl.searchParams.get('group');
  const country = request.nextUrl.searchParams.get('country');
  if (!isFoodGroup(group) || (country !== 'CA' && country !== 'US')) return NextResponse.json({ error: 'Invalid search filters' }, { status: 400 });
  try {
    const params = new URLSearchParams({ select: 'id,retailer,store_location,product_name,food_group,currency,price_minor,unit_quantity,unit_label,source_url,verified_at', country: 'eq.' + country, food_group: 'eq.' + group, expires_at: 'gt.' + new Date().toISOString(), order: 'price_minor.asc', limit: '50' });
    const result = await fetch(url + '/rest/v1/cart_snag_offers?' + params.toString(), { headers: { apikey: anonKey, authorization: token }, cache: 'no-store' });
    if (!result.ok) return NextResponse.json({ error: result.status === 401 ? 'Session expired' : 'Offers unavailable', offers: [] }, { status: result.status === 401 ? 401 : 503 });
    const offers = await result.json();
    return NextResponse.json({ offers, message: offers.length ? undefined : 'Unavailable at this time' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Offers unavailable', offers: [] }, { status: 503 }); }
}
