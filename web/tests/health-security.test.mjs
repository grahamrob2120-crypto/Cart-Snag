import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/api/health/route.ts', import.meta.url), 'utf8');

test('public health response does not expose individual environment configuration', () => {
  assert.doesNotMatch(source, /Object\.fromEntries\s*\(/);
  assert.doesNotMatch(source, /billing:\s*\{[^}]*configured\b/s);
  assert.doesNotMatch(source, /billing:\s*\{[^}]*environment\b/s);
  assert.match(source, /billing:\s*\{\s*ready:\s*billingReady\s*\}/);
});

test('public health response is not cached', () => {
  assert.match(source, /no-store/);
});

test('checkout is not reported ready unless explicitly enabled', () => {
  assert.match(source, /CART_SNAG_CHECKOUT_ENABLED\s*===\s*'true'/);
  assert.match(source, /environment\s*===\s*'live'/);
  assert.match(source, /environment\s*===\s*'sandbox'/);
});
