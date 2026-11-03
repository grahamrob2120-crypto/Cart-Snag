import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const fail = (status: number) => NextResponse.json(
  { active: false, error: status === 401 ? 'Sign in required' : 'Membership status unavailable' },
  { status, headers: { 'Cache-Control': 'no-store' } },
);

export async function GET(request: NextRequest) {
  const bearer = request.headers.get('authorization');
  if (!bearer?.startsWith('Bearer ') || bearer.length > 4096) return fail(401);
  const origin = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!origin || !anonKey || !serviceKey) return fail(503);

  try {
    const identity = await fetch(new URL('/auth/v1/user', origin), {
      headers: { apikey: anonKey, authorization: bearer },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!identity.ok) return fail(401);
    const user: unknown = await identity.json();
    if (!user || typeof user !== 'object' || !('id' in user) ||
      typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id)) return fail(401);

    const endpoint = new URL('/rest/v1/cart_snag_stripe_subscriptions', origin);
    endpoint.searchParams.set('select', 'status,current_period_end,cancel_at_period_end');
    endpoint.searchParams.set('user_id', 'eq.' + user.id);
    endpoint.searchParams.set('limit', '100');
    const records = await fetch(endpoint, {
      headers: { apikey: serviceKey, authorization: 'Bearer ' + serviceKey },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!records.ok) return fail(503);
    const rows: unknown = await records.json();
    if (!Array.isArray(rows)) return fail(503);
    const now = Date.now();
    const active = rows.some((row: unknown) => {
      if (!row || typeof row !== 'object' || !('status' in row) ||
        !('current_period_end' in row)) return false;
      const status = row.status;
      const end = row.current_period_end;
      return (status === 'active' || status === 'trialing') &&
        typeof end === 'string' && Number.isFinite(Date.parse(end)) && Date.parse(end) > now;
    });
    return NextResponse.json({ active }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail(503);
  }
}
