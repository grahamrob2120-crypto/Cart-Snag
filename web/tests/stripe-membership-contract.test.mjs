import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const offers = readFileSync(new URL('../app/api/offers/route.ts', import.meta.url), 'utf8');
const membership = readFileSync(new URL('../app/api/stripe/membership/route.ts', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../app/api/stripe/checkout/route.ts', import.meta.url), 'utf8');

test('grocery offers verify membership against Stripe projection only', () => {
  assert.match(offers, /cart_snag_stripe_subscriptions/);
  assert.doesNotMatch(offers, /cart_snag_subscriptions(?:['"]|\\b)/);
  assert.match(offers, /Active membership required/);
  assert.match(offers, /current_period_end/);
});

test('Stripe membership endpoint fails closed when backend is unavailable', () => {
  assert.match(membership, /cart_snag_stripe_subscriptions/);
  assert.match(membership, /return fail\(503\)/);
  assert.match(membership, /Date\.parse\(end\) > now/);
});

test('checkout cannot be enabled without explicit sandbox configuration', () => {
  assert.match(checkout, /CART_SNAG_STRIPE_CHECKOUT_ENABLED/);
  assert.match(checkout, /sk_test_/);
  assert.match(checkout, /existing subscription must be resolved/i);
});
