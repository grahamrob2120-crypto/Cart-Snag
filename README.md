# Cart Snag

**Let us save you money and look good doing it.**

G Software Developments' grocery savings application for Canada and the United States.

## Product scope
- Search grocery deals across meat, dairy, vegetables, fruit, and grains.
- Compare store prices and shopping travel costs.
- Canada/USA selection.
- Accounts with Supabase Auth and protected customer profiles.
- Receipt history, annual savings, and deal alerts.
- Future subscription billing and affiliate/advertising integrations.

## Current status
The Supabase project has a protected `profiles` table with row-level security. This repository is the starting point for the Cart Snag frontend. No verified live store-price feed or payment system is connected yet.

## Security
Never commit Supabase service-role/secret keys, payment secrets, or private customer data. A Supabase publishable key may be used in a browser client alongside enforced database row-level security. Payment processing must use a secure backend.

## Next implementation
Build and verify frontend login/signup and session-based route protection, then customer-owned receipt and savings data.
