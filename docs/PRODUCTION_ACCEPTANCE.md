# Cart Snag production rebuild — acceptance gates

Owner: G SOFTWARE DEVELOPMENTS. This branch is isolated from the existing GitHub Pages storefront. Do not merge or deploy until all gates pass.

## Tests before implementation (TDD)
1. **Identity:** unregistered, unverified, unpaid, expired, and revoked accounts cannot access paid deal APIs. Verify authorization on the server, not merely in the UI. Test cross-user access and RLS.
2. **Billing:** PayPal subscription activation requires a verified server-side webhook and an independently verified subscription state; duplicate, delayed, reordered, forged and replayed webhooks must not grant access. $5.99/year, CAD/USD pricing policy must be explicitly configured.
3. **Catalog:** reject anything outside meat, dairy, vegetables, fruits and grains, including spices, condiments and nonfood products, at ingestion and querying. Test product equivalence, unit normalization, pack sizes and currency boundaries.
4. **Pricing:** store source URL, retailer location, observed timestamp, validation status, units and confidence. Scheduled checks must run hourly on the hour; unavailable/blocked retailer data is marked stale, never fabricated. Respect site access restrictions.
5. **Deals:** only compare matching locations, currencies, equivalent products and current validated observations; account for travel costs without silently changing the displayed shelf price.
6. **Receipts:** enforce ownership, image access policy, file validation, OCR confirmation, itemization, correction and deletion. Test concurrent account and country switches.
7. **Portion Machine:** three recipes when feasible, with verified ingredient prices, serving counts, quantities, five-group restrictions and a budget constraint; otherwise state that no verified qualifying plan is available.
8. **Coupons:** require verified redemption conditions, retailer, location, validity and stacking restrictions.
9. **Beat Our Price:** one claim per paid member per rolling three months; qualifying major-chain regular offers only, no temporary store markdowns or independent shops. Human approval, audit trail, appeal, fraud screening and uncapped qualifying item-price reimbursement; do not auto-pay claims.
10. **Mobile/web:** end-to-end registration, payment, browsing, alerts, receipts, accessibility, location consent and account deletion on web, Android and iOS.
11. **Operations:** security scans, secrets isolation, migrations, backups/restore tests, monitoring, incident response, rate limiting and rollback drills.

## Build sequence
- Establish Next.js App Router + TypeScript + Tailwind in a separate app directory, with tests and CI.
- Implement database migrations and server-side membership authorization before exposing paid data.
- Integrate PayPal with idempotent webhooks and reconciliation.
- Implement compliant retailer connectors and validated price pipeline.
- Add shopping, Portion Machine, receipts, coupons, challenges and alerts.
- Package and test native mobile clients; conduct security and release reviews.

## Current verified limitations (2026-11-01)
The main branch is a static HTML/JavaScript frontend. Its README says no verified live price feed or payment system is connected. Existing regression tests are structural, not production integration tests. This file is a test plan, **not** evidence that the above tests or features have been implemented.

## Release policy
Do not expose production credentials in this public repository. Keep main deployable until the replacement passes every applicable gate. Never describe untested features as operational.

**Oath:** Created for the people. Founded by the people. Built to serve the people.
