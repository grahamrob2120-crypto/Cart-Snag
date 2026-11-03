'use client';
import { useEffect, useState } from 'react';
import { getAuthClient } from '../lib/auth-client';

type Country = 'CA' | 'US';
type Config = { url: string; anonKey: string; checkoutEnabled: boolean };
type Session = { access_token: string };
export default function MembershipCheckout() {
  const [country, setCountry] = useState<Country>('CA');
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [config, setConfig] = useState<Config | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    getAuthClient().then(({client, config: c}) => {
      if (!active) return;
      setConfig(c);
      const { data } = client.auth.onAuthStateChange((event, next) => {
        if (active) setSession(next);
        if (event === 'PASSWORD_RECOVERY') window.location.assign('/account/update-password');
      });
      unsubscribe = () => data.subscription.unsubscribe();
    }).catch(() => { if (active) setMessage('Membership service unavailable'); });
    return () => { active = false; unsubscribe?.(); };
  }, []);
  async function authenticate(mode: 'signin' | 'signup') {
    if (!email.trim() || !password || (mode === 'signup' && password.length < 8)) { setMessage(mode === 'signup' ? 'Enter a valid email and password of at least eight characters.' : 'Enter your email and password.'); return; }
    if (!config || busy) return;
    setBusy(true); setMessage('');
    try {
      const {client} = await getAuthClient();
      const credentials = { email: email.trim(), password };
      const {data, error} = mode === 'signin'
        ? await client.auth.signInWithPassword(credentials)
        : await client.auth.signUp({...credentials, options: {emailRedirectTo: window.location.origin}});
      if (error) throw error;
      setPassword('');
      setMessage(data.session ? 'Signed in successfully' : 'Check your email to confirm your account, then sign in.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Authentication unavailable'); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!config || !email.trim()) { setMessage('Enter your email address first.'); return; }
    setBusy(true);
    try {
      const {client} = await getAuthClient();
      const {error} = await client.auth.resetPasswordForEmail(email.trim(), {redirectTo: window.location.origin + '/account/update-password'});
      if (error) throw error;
      setMessage('If this account exists, password recovery instructions have been sent.');
    } catch { setMessage('Password reset unavailable'); } finally { setBusy(false); }
  }
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const {client} = await getAuthClient();
      const {error} = await client.auth.signOut({scope: 'local'});
      if (error) throw error;
      setMessage('Signed out');
    } catch { setMessage('Sign out failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function checkout() {
    if (!session || !config?.checkoutEnabled || busy) return;
    setBusy(true); setMessage('');
    try {
      const {client} = await getAuthClient();
      const {data, error} = await client.auth.getSession();
      if (error || !data.session) throw Error('Sign in before subscribing');
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + data.session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, plan }),
      });
      const result: { url?: string; error?: string } = await response.json();
      if (!response.ok || !result.url) throw Error(result.error || 'Checkout unavailable');
      const target = new URL(result.url);
      if (target.protocol !== 'https:' || !(target.hostname === 'checkout.stripe.com')) throw Error('Invalid checkout destination');
      window.location.assign(target.href);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Checkout unavailable'); setBusy(false); }
  }
  async function manageBilling() {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try {
      const {client} = await getAuthClient();
      const {data, error} = await client.auth.getSession();
      if (error || !data.session) throw Error('Sign in to manage billing');
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + data.session.access_token },
        cache: 'no-store',
      });
      const result: {url?: string; error?: string} = await response.json();
      if (!response.ok || !result.url) throw Error(result.error || 'Billing management unavailable');
      const target = new URL(result.url);
      if (target.protocol !== 'https:' || target.hostname !== 'billing.stripe.com') throw Error('Invalid billing destination');
      window.location.assign(target.href);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Billing management unavailable');
      setBusy(false);
    }
  }
  return <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-[#f5d77b] bg-[#041950] p-5 text-left">
    <label className="block text-sm font-bold text-[#ffe28b]" htmlFor="membership-country">Membership country</label>
    <select id="membership-country" className="mt-2 w-full rounded-lg bg-white p-3 text-[#07194c]" value={country} onChange={e => setCountry(e.target.value as Country)}>
      <option value="CA">Canada (CAD)</option><option value="US">United States (USD — coming soon)</option>
    </select>
    <label htmlFor="membership-plan" className="mt-3 block text-sm font-bold">Billing plan</label>
    <select id="membership-plan" value={plan} onChange={e => setPlan(e.target.value as 'monthly' | 'annual')} className="mt-2 w-full rounded-lg bg-white p-3 text-[#07194c]"><option value="monthly">$0.99 CAD/month</option><option value="annual">$10.99 CAD/year</option></select>
    {!session && <form className="mt-4 grid gap-3" onSubmit={e => { e.preventDefault(); void authenticate('signin'); }}>
      <label className="text-sm" htmlFor="membership-email">Email</label>
      <input id="membership-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="rounded-lg bg-white p-3 text-[#07194c]" />
      <label className="text-sm" htmlFor="membership-password">Password</label>
      <input id="membership-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="rounded-lg bg-white p-3 text-[#07194c]" />
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={!config || busy} className="rounded-full bg-[#ffe28b] px-5 py-3 font-bold text-[#07194c] disabled:opacity-50">Sign in</button><button type="button" disabled={!config || busy} onClick={() => void authenticate('signup')} className="rounded-full border border-[#ffe28b] px-5 py-3 font-bold disabled:opacity-50">Create account</button></div>
      <button type="button" disabled={!config || busy} onClick={() => void resetPassword()} className="text-left text-sm underline disabled:opacity-50">Forgot password?</button>
    </form>}
    {session && <button type="button" disabled={busy} onClick={() => void signOut()} className="mt-3 text-sm underline">Sign out</button>}
    {session && <button type="button" disabled={busy} onClick={() => void manageBilling()} className="mt-3 ml-4 text-sm underline disabled:opacity-50">Manage subscription or cancel</button>}
    <button type="button" disabled={!session || !config?.checkoutEnabled || busy || country !== 'CA'} onClick={() => void checkout()} className="mt-5 block w-full rounded-full bg-gradient-to-b from-[#fff1a4] to-[#d89d10] px-8 py-3 font-black text-[#07194c] disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Working…' : config?.checkoutEnabled ? 'Continue to Stripe' : 'Stripe checkout — activation pending'}</button>
    <p role="status" aria-live="polite" className="mt-3 text-sm text-[#ffe28b]">{message || (!config?.checkoutEnabled ? 'Payments are disabled until secure billing verification is complete. No payment will be collected.' : 'Stripe will confirm your recurring subscription charge before approval.')}</p>
  </div>;
}
