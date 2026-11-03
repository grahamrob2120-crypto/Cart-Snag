-- Cart Snag Stripe sandbox event journal.
-- Apply only after review and verification against the connected database.
-- Do not grant INSERT/UPDATE/DELETE to anon or authenticated roles.
create table if not exists public.cart_snag_stripe_events (
  id text primary key,
  event_type text not null,
  stripe_subscription_id text,
  stripe_customer_id text,
  user_id uuid references auth.users(id) on delete set null,
  livemode boolean not null default false,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  constraint stripe_event_id_valid check (id ~ '^evt_[A-Za-z0-9]+$'),
  constraint stripe_sandbox_only check (livemode = false)
);

alter table public.cart_snag_stripe_events enable row level security;
revoke all on public.cart_snag_stripe_events from anon, authenticated;
create index if not exists cart_snag_stripe_events_unprocessed_idx
  on public.cart_snag_stripe_events (received_at)
  where processed_at is null;
create index if not exists cart_snag_stripe_events_subscription_idx
  on public.cart_snag_stripe_events (stripe_subscription_id);
