# Cart Snag — Retailer price ingestion operations

## Verified status (2026-11-03)
The deployed Supabase Edge Function `cart-snag-price-refresh` exists. Its existing Save-On-Foods sources returned HTTP 403 in the most recent inspected run (12 failures). Do not label historical or unavailable records as current deals.

The browser offer query must require `availability = 'verified'`, a fresh `verified_at`, the selected country/currency, and an unexpired `expires_at`. Never use demo prices as live prices.

## Before expanding coverage
1. Obtain an authorized retailer feed, API agreement, or permitted data distribution channel. Do not attempt to defeat anti-bot controls.
2. Confirm store identity, product identifier, exact size/unit, taxes/deposits, availability, source URL, and observation timestamp.
3. Preserve original observations and error logs. On source failure, keep user-facing prices unavailable rather than reusing stale values.
4. Verify the scheduler actually invokes the function at 09:00, 12:00, and 17:00 store-local time, with hourly retries for missing observations. A deployed function alone does not prove a scheduler is configured.
5. Validate at least one successful end-to-end run: authorized source -> ingestion -> database -> public query -> UI. Verify both CA and US independently.

## Known limitation
The existing Save-On-Foods function only targets two Regina store identifiers. This is not nationwide Canada/USA coverage. The storefront must not imply verified local coverage until location matching is implemented.
