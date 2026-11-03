import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const api = readFileSync(new URL('../app/api/stripe/portal/route.ts', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../app/membership-checkout.tsx', import.meta.url), 'utf8');
test('billing portal requires authenticated ownership and sandbox Stripe', () => {
 assert.match(api, /auth\/v1\/user/);
 assert.match(api, /cart_snag_stripe_subscriptions/);
 assert.match(api, /customers.length !== 1/);
 assert.match(api, /sk_test_/);
 assert.match(api, /billing.stripe.com/);
});
test('members can open self-service subscription management', () => {
 assert.match(ui, /Manage subscription or cancel/);
 assert.match(ui, /api\/stripe\/portal/);
 assert.match(ui, /billing.stripe.com/);
});
