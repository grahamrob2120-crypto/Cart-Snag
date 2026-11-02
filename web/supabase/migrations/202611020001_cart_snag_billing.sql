-- Cart Snag isolated membership and PayPal event persistence.
-- Review and apply to the intended Supabase project; never run against a shared project blindly.
create table if not exists public.cart_snag_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paypal_subscription_id text,
  paypal_plan_id text,
  billing_interval text not null check (billing_interval in ('monthly','annual')),
  status text not null default 'pending' check (status in ('pending','active','suspended','cancelled','expired')),
  environment text not null check (environment in ('sandbox','live')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment, paypal_subscription_id)
);
create index if not exists cart_snag_subscriptions_user_status_idx
  on public.cart_snag_subscriptions (user_id, status);
create unique index if not exists cart_snag_one_open_subscription_per_user
  on public.cart_snag_subscriptions (user_id, environment)
  where status in ('pending','active','suspended');

create table if not exists public.cart_snag_paypal_events (
  id text not null,
  environment text not null check (environment in ('sandbox','live')),
  event_type text not null,
  subscription_id text,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now(),
  primary key (id, environment)
);
create index if not exists cart_snag_paypal_events_pending_idx
  on public.cart_snag_paypal_events (received_at) where processed_at is null;

alter table public.cart_snag_subscriptions enable row level security;
alter table public.cart_snag_paypal_events enable row level security;
grant select on public.cart_snag_subscriptions to authenticated;
drop policy if exists members_read_own_subscription on public.cart_snag_subscriptions;
create policy members_read_own_subscription on public.cart_snag_subscriptions for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.cart_snag_paypal_events from anon, authenticated;
-- Server endpoints use the service role after authenticating the user and checking entitlement.
-- Members may read only their own subscription; neither payment table allows client writes.
