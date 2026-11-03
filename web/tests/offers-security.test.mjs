import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/api/offers/route.ts', import.meta.url), 'utf8');

test('offers endpoint requires server-verified active membership', () => {
  assert.match(source, /\/auth\/v1\/user/);
  assert.match(source, /cart_snag_stripe_subscriptions/);
  assert.doesNotMatch(source, /\/rest\/v1\/cart_snag_subscriptions/);
  assert.match(source, /current_period_end/);
});

test('all outbound offers requests have bounded timeouts', () => {
  const requests = source.match(/await fetch\(/g) ?? [];
  const timeouts = source.match(/signal:\s*AbortSignal\.timeout\(10000\)/g) ?? [];
  assert.equal(requests.length, 3);
  assert.equal(timeouts.length, requests.length);
});

test('only verified, fresh and unexpired offers are returned', () => {
  assert.match(source, /availability: 'eq\.verified'/);
  assert.match(source, /row\.availability === 'verified'/);
  assert.match(source, /verified_at: 'gte\.'/);
  assert.match(source, /expires_at: 'gt\.'/);
  assert.match(source, /Unavailable at this time/);
});
