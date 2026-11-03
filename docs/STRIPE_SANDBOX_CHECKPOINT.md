# Stripe sandbox integration checkpoint

Branch: cart-snag-foundation-2026-11-03

Created in connected Stripe sandbox:
- Product: prod_VYyLqwSaiDmmRp
- CAD monthly price: price_1UXqOhAVbpK1wYL1asv2wrUL (99 cents)
- CAD annual price: price_1UXqOiAVbpK1wYL1Lz5l8L4Z (1099 cents)

Existing API routes:
- /api/stripe/status (configuration check)
- /api/stripe/checkout (sandbox-only, authenticated, disabled by default)

Required before enabling checkout:
1. Connect frontend to Stripe checkout and plan selection.
2. Verify webhook signatures and persist subscription state idempotently.
3. Reconcile subscription ownership and cancellation against Supabase.
4. Block duplicate subscriptions and add billing portal.
5. Configure environment variables and test against Stripe sandbox.
6. Verify country/currency handling and fees; US prices are not configured.
7. Review subscription terms, taxes, refunds, and app-store billing rules.

Never enable live billing merely because a Checkout success URL was visited.
