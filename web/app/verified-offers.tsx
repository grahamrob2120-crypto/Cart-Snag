'use client';
import { useEffect, useState } from 'react';
type Offer={id:number;retailer:string;store_location:string;product_name:string;currency:string;price_minor:number;unit_quantity:number;unit_label:string;source_url:string;verified_at:string};
export default function VerifiedOffers() {
 const [country,setCountry]=useState<'CA'|'US'>('CA');
 const [group,setGroup]=useState('meat');
 const [token,setToken]=useState('');
 useEffect(() => { const onSession=(event:Event)=>{const detail=(event as CustomEvent<{accessToken?:string}>).detail;setToken(detail?.accessToken||'');};window.addEventListener('cart-snag-session',onSession);return ()=>window.removeEventListener('cart-snag-session',onSession);},[]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [message,setMessage]=useState('Sign in above to browse verified member offers.');
 const [busy,setBusy]=useState(false);
 async function search(e:React.FormEvent){e.preventDefault();setBusy(true);setOffers([]);try{
 const response=await fetch('/api/offers?'+new URLSearchParams({country,group}),{headers:{Authorization:'Bearer '+token.trim()},cache:'no-store'});
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Offers unavailable');
 setOffers(Array.isArray(data.offers)?data.offers:[]);setMessage(data.message||'Verified retailer offers');
 }catch(error){setMessage(error instanceof Error?error.message:'Offers unavailable')}finally{setBusy(false)}}
 return <section id="verified-offers" className="mt-8 rounded-2xl border-2 border-[#e9ba4e] bg-[#09266c] p-6"><h2 className="text-2xl font-black text-[#ffe28b]">Verified grocery offers</h2><p className="mt-2 text-sm">Only current, verified offers are displayed. Unavailable prices are never estimated.</p><form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-2"><label>Country<select className="mt-1 block w-full rounded p-2 text-black" value={country} onChange={e=>setCountry(e.target.value as 'CA'|'US')}><option value="CA">Canada</option><option value="US">United States</option></select></label><label>Food group<select className="mt-1 block w-full rounded p-2 text-black" value={group} onChange={e=>setGroup(e.target.value)}>{['meat','dairy','vegetables','fruits','grains'].map(x=><option key={x} value={x}>{x}</option>)}</select></label><button className="rounded bg-[#f8d76e] p-3 font-bold text-[#07194c] disabled:opacity-50 sm:col-span-2" disabled={busy||!token}>{busy?'Searching…':'Search verified prices'}</button></form><p role="status" className="mt-4">{message}</p><ul className="mt-4 grid gap-3">{offers.map(o=><li key={o.id} className="rounded-lg bg-white p-3 text-[#07194c]"><strong>{o.product_name}</strong> — {o.retailer}, {o.store_location}<p>{new Intl.NumberFormat(country==='CA'?'en-CA':'en-US',{style:'currency',currency:o.currency}).format(o.price_minor/100)} per {o.unit_quantity} {o.unit_label}</p><a href={o.source_url} target="_blank" rel="noopener noreferrer" className="underline">Retailer source</a><p className="text-xs">Verified {new Date(o.verified_at).toLocaleString()}</p></li>)}</ul></section>;
}
