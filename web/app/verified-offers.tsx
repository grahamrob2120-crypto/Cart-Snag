'use client';
import { useEffect, useState, useRef } from 'react';
import { getAuthClient } from '../lib/auth-client';
type Offer={id:number;retailer:string;store_location:string;product_name:string;currency:string;price_minor:number;unit_quantity:number;unit_label:string;source_url:string;verified_at:string};
export default function VerifiedOffers() {
 const [country,setCountry]=useState<'CA'|'US'>('CA');
 const [group,setGroup]=useState('meat');
 const [query,setQuery]=useState('');
 const [store,setStore]=useState('');
 const [maxPrice,setMaxPrice]=useState('');
 const [sort,setSort]=useState<'price'|'recent'>('price');
 const [token,setToken]=useState('');
 const [shoppingList,setShoppingList]=useState<Offer[]>([]);
 useEffect(() => { try { const raw=window.localStorage.getItem('cart-snag-shopping-list'); const data=raw?JSON.parse(raw):[]; if(Array.isArray(data))setShoppingList(data.filter((x:unknown):x is Offer=>!!x&&typeof x==='object'&&'id' in x&&typeof x.id==='number'&&'price_minor' in x&&typeof x.price_minor==='number'&&'product_name' in x&&typeof x.product_name==='string'&&'currency' in x&&typeof x.currency==='string'&&'retailer' in x&&typeof x.retailer==='string').slice(0,100)); } catch { setShoppingList([]); } },[]);
 function saveList(next:Offer[]){setShoppingList(next);try{window.localStorage.setItem('cart-snag-shopping-list',JSON.stringify(next));}catch{setMessage('Shopping list could not be saved on this device.');}}
 function addItem(offer:Offer){if(shoppingList.some(x=>x.id===offer.id))return;saveList([...shoppingList,offer].slice(0,100));}
 function removeItem(id:number){saveList(shoppingList.filter(x=>x.id!==id));}
 const generation = useRef(0);
 useEffect(() => {
  let active = true;
  let unsubscribe: (()=>void) | undefined;
  getAuthClient().then(({client}) => {
   if (!active) return;
   const {data} = client.auth.onAuthStateChange((_event,session) => {
    if (!active) return;
    generation.current++;
    setToken(session?.access_token || ''); setOffers([]); setBusy(false);
    setMessage(session ? 'Search for current verified prices.' : 'Sign in above to browse verified member offers.');
   });
   unsubscribe = () => data.subscription.unsubscribe();
  }).catch(()=>{if(active)setMessage('Authentication unavailable');});
  return ()=>{active=false;unsubscribe?.();};
 },[]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [message,setMessage]=useState('Sign in above to browse verified member offers.');
 const [busy,setBusy]=useState(false);
 useEffect(() => {
  generation.current++;
  setOffers([]);
  setBusy(false);
  setMessage('Search for current verified prices in the selected country and food group.');
 }, [country, group, query, store, maxPrice, sort]);
 async function search(e:React.FormEvent){e.preventDefault();const requestGeneration=++generation.current;setBusy(true);setOffers([]);try{
 const {client}=await getAuthClient();const {data:auth,error}=await client.auth.getSession();if(error||!auth.session)throw new Error('Sign in required');
 const response=await fetch('/api/offers?'+new URLSearchParams({country,group,q:query.trim(),store:store.trim()}),{headers:{Authorization:'Bearer '+auth.session.access_token},cache:'no-store'});
 const data=await response.json();if(requestGeneration!==generation.current)return;if(!response.ok)throw new Error(data.error||'Offers unavailable');
 const verified: Offer[] = Array.isArray(data.offers) ? data.offers : [];
 const cap = maxPrice.trim() === '' ? null : Math.round(Number(maxPrice) * 100);
 if (cap !== null && (!Number.isSafeInteger(cap) || cap < 0)) throw new Error('Enter a valid maximum price');
 const affordable = verified.filter(o => Number.isSafeInteger(o.price_minor) && (cap === null || o.price_minor <= cap)).sort((a,b) => sort === 'price' ? a.price_minor - b.price_minor || a.product_name.localeCompare(b.product_name) : Date.parse(b.verified_at) - Date.parse(a.verified_at));
 setOffers(affordable);setMessage(affordable.length ? 'Verified retailer offers within your budget' : 'Unavailable at this time');
 }catch(error){if(requestGeneration===generation.current)setMessage(error instanceof Error?error.message:'Offers unavailable')}finally{if(requestGeneration===generation.current)setBusy(false)}}
 return <section id="verified-offers" className="mt-8 rounded-2xl border-2 border-[#e9ba4e] bg-white p-6 text-[#07194c] shadow-lg"><h2 className="text-2xl font-black text-[#07194c]">Verified grocery offers</h2><p className="mt-2 text-sm">Only current, verified offers are displayed. Unavailable prices are never estimated.</p><form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2">Search grocery item<input type="search" maxLength={80} placeholder="e.g. milk, apples, chicken" value={query} onChange={e=>setQuery(e.target.value)} className="mt-1 block w-full rounded p-2 text-black" /></label><label className="sm:col-span-2">City or store location<input type="search" maxLength={120} placeholder="e.g. Regina" value={store} onChange={e=>setStore(e.target.value)} className="mt-1 block w-full rounded p-2 text-black" /></label><label>Maximum item price (optional)<input type="number" min="0" max="100000" step="0.01" inputMode="decimal" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="mt-1 block w-full rounded p-2 text-black" placeholder="e.g. 5.00" /></label><label>Sort results<select value={sort} onChange={e=>setSort(e.target.value as 'price'|'recent')} className="mt-1 block w-full rounded p-2 text-black"><option value="price">Lowest price first</option><option value="recent">Recently verified first</option></select></label><label>Country<select className="mt-1 block w-full rounded p-2 text-black" value={country} onChange={e=>setCountry(e.target.value as 'CA'|'US')}><option value="CA">Canada</option><option value="US">United States</option></select></label><label>Food group<select className="mt-1 block w-full rounded p-2 text-black" value={group} onChange={e=>setGroup(e.target.value)}>{['meat','dairy','vegetables','fruits','grains'].map(x=><option key={x} value={x}>{x}</option>)}</select></label><button className="rounded bg-[#f8d76e] p-3 font-bold text-[#07194c] disabled:opacity-50 sm:col-span-2" disabled={busy||!token}>{busy?'Searching…':'Search verified prices'}</button></form><p role="status" className="mt-4">{message}</p><ul className="mt-4 grid gap-3">{offers.map(o=><li key={o.id} className="rounded-lg bg-white p-3 text-[#07194c]"><strong>{o.product_name}</strong> — {o.retailer}, {o.store_location}<p>{new Intl.NumberFormat(country==='CA'?'en-CA':'en-US',{style:'currency',currency:o.currency}).format(o.price_minor/100)} per {o.unit_quantity} {o.unit_label}</p><a href={o.source_url} target="_blank" rel="noopener noreferrer" className="underline">Retailer source</a><button type="button" onClick={()=>addItem(o)} disabled={shoppingList.some(x=>x.id===o.id)} className="ml-3 rounded bg-[#07194c] px-3 py-2 text-white disabled:opacity-50">{shoppingList.some(x=>x.id===o.id)?"Added to list":"Add to shopping list"}</button><p className="text-xs">Verified {new Date(o.verified_at).toLocaleString()}</p></li>)}</ul><section aria-label="Saved shopping list" className="mt-6 rounded-xl bg-white p-4 text-[#07194c]"><h3 className="text-xl font-black">My shopping list</h3><p className="mt-1 text-sm">Saved on this device. Prices may change; verify before shopping.</p><ul className="mt-3 space-y-2">{shoppingList.map(o=><li key={o.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"><span>{o.product_name} — {o.retailer} ({o.currency} {(o.price_minor/100).toFixed(2)})</span><button type="button" onClick={()=>removeItem(o.id)} className="rounded border px-3 py-1">Remove</button></li>)}</ul><p className="mt-3 font-bold">Estimated item total: {shoppingList.length && shoppingList.every(o=>o.currency===shoppingList[0].currency) ? shoppingList[0].currency+" "+(shoppingList.reduce((sum,o)=>sum+o.price_minor,0)/100).toFixed(2) : shoppingList.length ? "Mixed currencies — select one country" : "0.00"}</p></section></section>;
}
