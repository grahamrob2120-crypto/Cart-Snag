# PayPal sandbox setup for Cart Snag

The subscription API endpoint is `POST /api/paypal/subscriptions`. It requires a valid Supabase access token and JSON body `{"country":"CA"}` or `{"country":"US"}`.

## Required Vercel environment variables

Set these in Vercel Project Settings > Environment Variables, scoped to Preview first. Do not commit secrets.

- `PAYPAL_ENVIRONMENT=sandbox`
- `PAYPAL_CLIENT_ID` — sandbox REST app client ID
- `PAYPAL_CLIENT_SECRET` — sandbox REST app client secret (secret)
- `PAYPAL_PLAN_ID_CA` — sandbox plan ID for CAD 0.99 monthly
- `PAYPAL_PLAN_ID_US` — sandbox plan ID for USD 1.19 monthly
- `SUPABASE_URL` — existing Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase publishable/anon key (not service-role key)
- `PUBLIC_APP_ORIGIN` — exact HTTPS preview site origin without trailing slash

Create two PayPal sandbox products/plans in PayPal Developer, with MONTH frequency and INTERVAL_COUNT=1. Confirm currency and amount on the PayPal side: CAD 0.99 for Canada; USD 1.19 for United States. Plan IDs are not interchangeable between sandbox and live.

## Security and release gates

- Do not grant access based on the browser return URL or a client-supplied subscription ID.
- Do not enable checkout UI until webhook signature verification, database entitlement reconciliation, replay protection, and cancellation/refund handling are implemented and tested.
- PayPal webhook verification must use PayPal's official verify-webhook-signature endpoint and configured webhook ID.
- Confirm the sandbox plans, currencies, amounts and payment fees before activation.
- The subscription API currently only creates an approval session and returns a PayPal URL; it does not activate access.
- Do not set `PAYPAL_ENVIRONMENT=live` until the full sandbox test suite passes and the owner approves activation.

## Test matrix

1. Missing/expired Supabase bearer token -> 401; unavailable Supabase config -> 503.
2. Invalid country -> 400; missing country-specific plan -> 503.
3. Sandbox OAuth failure -> no checkout URL; no credential disclosure.
4. PayPal subscription approval URL must be HTTPS and a PayPal-owned hostname.
5. Webhook payment confirmation -> one entitlement only, even for repeated delivery.
6. Subscription cancellation, failed payment, refunds -> correct entitlement changes.
7. Canadian checkout shows CAD 0.99/month; US checkout shows USD 1.19/month.
8. Failed webhook verification must never grant membership.

Status: sandbox credentials/plans are not yet configured in Vercel. Payment processing remains disabled.
