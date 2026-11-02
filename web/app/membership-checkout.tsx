'use client';
import { useEffect, useState } from 'react';

type Country = 'CA' | 'US';
type Config = { url: string; anonKey: string; checkoutEnabled: boolean };
type Session = { access_token: string };
export default function MembershipCheckout() {
  const [country, setCountry] = useState<Country>('CA');
  const [config, setConfig] = useState<Config | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/membership/config', { cache: 'no-store' }).then(async r => {
      if (!r.ok) throw Error('Membership service unavailable');
      return r.json() as Promise<Config>;
    }).then(c => { if (active) setConfig(c); }).catch(() => { if (active) setMessage('Membership service unavailable'); });
    return () => { active = false; };
  }, []);
  async function authenticate(mode: 'signin' | 'signup') {
    if (!email.trim() || !password || password.length < 6) { setMessage('Enter a valid email and password of at least six characters.'); return; }
    if (!config || busy) return;
    setBusy(true); setMessage('');
    try {
      const endpoint = mode === 'signin' ? '/auth/v1/token?grant_type=password' : '/auth/v1/signup';
      const response = await fetch(config.url + endpoint, {
        method: 'POST',
        headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result: { access_token?: string; error_description?: string; msg?: string } = await response.json();
      if (!response.ok) throw Error(result.error_description || result.msg || 'Authentication failed');
      if (result.access_token) { setSession({ access_token: result.access_token }); window.dispatchEvent(new CustomEvent('cart-snag-session',{detail:{accessToken:result.access_token}})); setPassword(''); setMessage('Signed in successfully'); }
      else setMessage('Check your email to confirm your account, then sign in.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Authentication unavailable'); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!config || !email.trim()) { setMessage('Enter your email address first.'); return; }
    setBusy(true);
    try {
      const response = await fetch(config.url + '/auth/v1/recover', { method: 'POST', headers: { apikey: config.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      if (!response.ok) throw Error('Password reset unavailable');
      setMessage('If this account exists, password recovery instructions have been sent.');
    } catch { setMessage('Password reset unavailable'); } finally { setBusy(false); }
  }
  async function checkout() {
    if (!session || !config?.checkoutEnabled || busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/paypal/subscriptions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      });
      const result: { approveUrl?: string; error?: string } = await response.json();
      if (!response.ok || !result.approveUrl) throw Error(result.error || 'Checkout unavailable');
      const target = new URL(result.approveUrl);
      if (target.protocol !== 'https:' || !(target.hostname === 'paypal.com' || target.hostname.endsWith('.paypal.com'))) throw Error('Invalid checkout destination');
      window.location.assign(target.href);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Checkout unavailable'); setBusy(false); }
  }
  return <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-[#f5d77b] bg-[#041950] p-5 text-left">
    <label className="block text-sm font-bold text-[#ffe28b]" htmlFor="membership-country">Membership country</label>
    <select id="membership-country" className="mt-2 w-full rounded-lg bg-white p-3 text-[#07194c]" value={country} onChange={e => setCountry(e.target.value as Country)}>
      <option value="CA">Canada — $0.99 CAD/month</option><option value="US">United States — $1.19 USD/month</option>
    </select>
    {!session && <form className="mt-4 grid gap-3" onSubmit={e => { e.preventDefault(); void authenticate('signin'); }}>
      <label className="text-sm" htmlFor="membership-email">Email</label>
      <input id="membership-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="rounded-lg bg-white p-3 text-[#07194c]" />
      <label className="text-sm" htmlFor="membership-password">Password</label>
      <input id="membership-password" type="password" minLength={6} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="rounded-lg bg-white p-3 text-[#07194c]" />
      <div className="flex flex-wrap gap-3"><button type="submit" disabled={!config || busy} className="rounded-full bg-[#ffe28b] px-5 py-3 font-bold text-[#07194c] disabled:opacity-50">Sign in</button><button type="button" disabled={!config || busy} onClick={() => void authenticate('signup')} className="rounded-full border border-[#ffe28b] px-5 py-3 font-bold disabled:opacity-50">Create account</button></div>
      <button type="button" disabled={!config || busy} onClick={() => void resetPassword()} className="text-left text-sm underline disabled:opacity-50">Forgot password?</button>
    </form>}
    {session && <button type="button" onClick={() => { setSession(null); window.dispatchEvent(new CustomEvent('cart-snag-session',{detail:{accessToken:''}})); setMessage('Signed out'); }} className="mt-3 text-sm underline">Sign out</button>}
    <button type="button" disabled={!session || !config?.checkoutEnabled || busy} onClick={() => void checkout()} className="mt-5 block w-full rounded-full bg-gradient-to-b from-[#fff1a4] to-[#d89d10] px-8 py-3 font-black text-[#07194c] disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Working…' : config?.checkoutEnabled ? 'Continue to PayPal' : 'PayPal checkout — activation pending'}</button>
    <p role="status" aria-live="polite" className="mt-3 text-sm text-[#ffe28b]">{message || (!config?.checkoutEnabled ? 'Payments are disabled until secure billing verification is complete. No payment will be collected.' : 'PayPal will confirm your recurring monthly charge before approval.')}</p>
  </div>;
}
