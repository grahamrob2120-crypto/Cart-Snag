'use client';
import { useEffect, useState } from 'react';
import { getAuthClient } from '../../../lib/auth-client';
export default function UpdatePassword() {
 const [ready,setReady]=useState(false);
 const [password,setPassword]=useState('');
 const [confirmation,setConfirmation]=useState('');
 const [busy,setBusy]=useState(false);
 const [done,setDone]=useState(false);
 const [message,setMessage]=useState('Checking your recovery link…');
 useEffect(()=>{
  let active=true; let unsubscribe:(()=>void)|undefined;
  getAuthClient().then(({client})=>{
   if(!active)return;
   const {data}=client.auth.onAuthStateChange((_event,session)=>{
    if(!active)return;
    setReady(Boolean(session));
    setMessage(session?'Choose your new password.':'Open the recovery link from your email, or sign in first.');
   });
   unsubscribe=()=>data.subscription.unsubscribe();
  }).catch(()=>{if(active)setMessage('Password recovery unavailable. Please try again.');});
  return()=>{active=false;unsubscribe?.();};
 },[]);
 async function save(e:React.FormEvent){
  e.preventDefault(); if(!ready||busy)return;
  if(password.length<8){setMessage('Use at least eight characters.');return;}
  if(password!==confirmation){setMessage('Passwords must match.');return;}
  setBusy(true);
  try{
   const {client}=await getAuthClient();
   const {error}=await client.auth.updateUser({password});
   if(error)throw error;
   setPassword('');setConfirmation('');setDone(true);setMessage('Password updated.');
  }catch(error){setMessage(error instanceof Error?error.message:'Password update failed.');}
  finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-lg p-8"><h1 className="text-3xl font-bold">Set your password</h1><p role="status" className="my-4">{message}</p>{!done&&<form onSubmit={save} className="grid gap-4"><label>New password<input aria-label="New password" type="password" autoComplete="new-password" minLength={8} required disabled={!ready||busy} className="block w-full rounded border p-3 text-black" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm new password<input aria-label="Confirm new password" type="password" autoComplete="new-password" minLength={8} required disabled={!ready||busy} className="block w-full rounded border p-3 text-black" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label><button disabled={!ready||busy} className="rounded bg-yellow-300 p-3 font-bold text-black disabled:opacity-50">{busy?'Saving…':'Save password'}</button></form>}<a className="mt-6 block underline" href="/">Return to Cart Snag</a></main>;
}
