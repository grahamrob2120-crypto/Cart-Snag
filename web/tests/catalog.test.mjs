import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../lib/catalog.ts', import.meta.url), 'utf8');
test('catalog uses exactly the approved five groups', () => {
  assert.match(source, /'meat', 'dairy', 'vegetables', 'fruits', 'grains'/);
  assert.doesNotMatch(source, /'spices'|'condiments'|'other'/);
});
test('catalog rejects invalid group, currency, price and name', () => {
  for (const requirement of ['Unsupported food group', 'Unsupported currency', 'Invalid price', 'Invalid product name']) assert.ok(source.includes(requirement));
});
