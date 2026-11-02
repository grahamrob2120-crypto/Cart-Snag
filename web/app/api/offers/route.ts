import { NextRequest, NextResponse } from 'next/server';
import { isFoodGroup } from '../../../lib/catalog';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const token = request.headers.get('authorization');
  if (!token?.startsWith('Bearer ') || token.length > 4096 || !token.slice(7).trim()) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  // Validate identity and paid entitlement on the server; a bearer token alone is insufficient.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Membership verification unavailable' }, { status: 503 });
  let userId: string;
  try {
    const identity = await fetch(new URL('/auth/v1/user', url), {
      headers: { apikey: anonKey, authorization: token }, cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!identity.ok) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    const user: unknown = await identity.json();
    if (!user || typeof user !== 'object' || !('id' in user) ||
        typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id))
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    userId = user.id;
    const membershipUrl = new URL('/rest/v1/cart_snag_subscriptions', url);
    membershipUrl.searchParams.set('select', 'status,current_period_end');
    membershipUrl.searchParams.set('user_id', 'eq.' + userId);
    membershipUrl.searchParams.set('status', 'eq.active');
    membershipUrl.searchParams.set('limit', '1');
    const membership = await fetch(membershipUrl, {
      headers: { apikey: serviceKey, authorization: 'Bearer ' + serviceKey },
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!membership.ok) return NextResponse.json({ error: 'Membership verification unavailable' }, { status: 503 });
    const records: unknown = await membership.json();
    if (!Array.isArray(records)) return NextResponse.json({ error: 'Membership verification unavailable' }, { status: 503 });
    const entitled = records.some((record: unknown) => {
      if (!record || typeof record !== 'object' || !('current_period_end' in record)) return false;
      const end = record.current_period_end;
      return typeof end === 'string' && Number.isFinite(Date.parse(end)) && Date.parse(end) > Date.now();
    });
    if (!entitled) return NextResponse.json({ error: 'Active membership required' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Membership verification unavailable' }, { status: 503 });
  }
  const group = request.nextUrl.searchParams.get('group');
  const country = request.nextUrl.searchParams.get('country');
  const search = (request.nextUrl.searchParams.get('q') ?? '').trim();
  const store = (request.nextUrl.searchParams.get('store') ?? '').trim();
  if (store.length > 120 || /[\u0000-\u001f\u007f]/.test(store)) return NextResponse.json({ error: 'Invalid store location' }, { status: 400 });
  if (search.length > 80 || /[\u0000-\u001f\u007f]/.test(search)) return NextResponse.json({ error: 'Invalid product search' }, { status: 400 });
  if (!isFoodGroup(group) || (country !== 'CA' && country !== 'US')) return NextResponse.json({ error: 'Invalid search filters' }, { status: 400 });
  try {
    const now = Date.now();
    const recent = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({ verified_at: 'gte.' + recent, select: 'id,retailer,store_location,product_name,food_group,currency,price_minor,unit_quantity,unit_label,source_url,verified_at', country: 'eq.' + country, food_group: 'eq.' + group, expires_at: 'gt.' + new Date().toISOString(), order: 'price_minor.asc', limit: '50' });
    const safeSearch = search.replace(/[*,().%_\\]/g, '').trim();
    const safeStore = store.replace(/[*,().%_\\]/g, '').trim();
    if (store && !safeStore) return NextResponse.json({ error: 'Enter a valid store location' }, { status: 400 });
    if (safeStore) params.set('store_location', 'ilike.*' + safeStore + '*');
    if (search && !safeSearch) return NextResponse.json({ error: 'Enter a searchable product name' }, { status: 400 });
    if (safeSearch) params.set('product_name', 'ilike.*' + safeSearch + '*');
    const result = await fetch(url + '/rest/v1/cart_snag_offers?' + params.toString(), { headers: { apikey: anonKey, authorization: token }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!result.ok) return NextResponse.json({ error: result.status === 401 ? 'Session expired' : 'Offers unavailable', offers: [] }, { status: result.status === 401 ? 401 : 503 });
    const data: unknown = await result.json();
    if (!Array.isArray(data)) return NextResponse.json({ error: 'Invalid offers response', offers: [] }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    const offers = data.filter((offer): offer is Record<string, unknown> => {
      if (!offer || typeof offer !== 'object') return false;
      const row = offer as Record<string, unknown>;
      const verified = typeof row.verified_at === 'string' ? Date.parse(row.verified_at) : NaN;
      const source = typeof row.source_url === 'string' ? row.source_url : '';
      let validSource = false;
      try { const parsed = new URL(source); validSource = parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password; } catch { /* invalid source */ }
      return validSource && Number.isFinite(verified) && verified >= now - 86400000 && verified <= now &&
        typeof row.price_minor === 'number' && Number.isSafeInteger(row.price_minor) && row.price_minor >= 0 &&
        row.food_group === group && row.currency === (country === 'CA' ? 'CAD' : 'USD') &&
        typeof row.unit_quantity === 'number' && Number.isFinite(row.unit_quantity) && row.unit_quantity > 0;
    });
    return NextResponse.json({ offers, message: offers.length ? undefined : 'Unavailable at this time' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Offers unavailable', offers: [] }, { status: 503 }); }
}
