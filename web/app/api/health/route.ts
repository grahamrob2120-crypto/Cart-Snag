import { NextResponse } from 'next/server';
export const runtime='nodejs';
export function GET(){
 const required=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_PLAN_ID_CA','PAYPAL_PLAN_ID_US','PUBLIC_APP_ORIGIN'] as const;
 const configured=Object.fromEntries(required.map(key=>[key,Boolean(process.env[key])]));
 const checkoutEnabled=process.env.CART_SNAG_CHECKOUT_ENABLED==='true';
 const environment=process.env.PAYPAL_ENVIRONMENT==='live'?'live':process.env.PAYPAL_ENVIRONMENT==='sandbox'?'sandbox':'unconfigured';
 const ready=checkoutEnabled&&environment!=='unconfigured'&&Object.values(configured).every(Boolean);
 return NextResponse.json({status:'ok',service:'cart-snag-web',billing:{ready,checkoutEnabled,environment,configured}}, {headers:{'Cache-Control':'no-store'}});
}
