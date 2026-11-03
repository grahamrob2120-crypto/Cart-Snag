-- Proposed Stripe-only subscription projection, pending database review.
create table if not exists public.cart_snag_stripe_subscriptions (
  stripe_subscription_id text primary key,
  stripe_customer_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_event_created bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.cart_snag_stripe_subscriptions enable row level security;
revoke all on public.cart_snag_stripe_subscriptions from anon, authenticated;
grant select, insert, update on public.cart_snag_stripe_subscriptions to service_role;
create index if not exists cart_snag_stripe_subscriptions_user_idx
  on public.cart_snag_stripe_subscriptions (user_id);
