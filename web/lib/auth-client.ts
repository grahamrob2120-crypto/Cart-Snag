'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
export type AuthConfig = { url: string; anonKey: string; checkoutEnabled: boolean };
let pending: Promise<{ client: SupabaseClient; config: AuthConfig }> | undefined;
export function getAuthClient() {
  if (!pending) pending = (async () => {
    const response = await fetch('/api/membership/config', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Membership service unavailable');
    const config: AuthConfig = await response.json();
    if (!config.url || !config.anonKey) throw new Error('Authentication unavailable');
    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'cart-snag-auth' },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) },
    });
    return { client, config };
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}
