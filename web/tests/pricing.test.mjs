import test from 'node:test';
import assert from 'node:assert/strict';
import {validateObservation, normalizedPriceMinor, compareOffers} from '../lib/pricing.mjs';
const now = '2026-11-01T18:00:00.000Z';
const base = {group:'dairy',productKey:'milk-2pct',retailerId:'chain-1',locationId:'regina',currency:'CAD',priceMinor:499,quantity:2,unit:'l',sourceUrl:'https://example.com/milk',observedAt:now,verified:true};
test('rejects unsupported groups and unverified observations', () => {
  assert.throws(() => validateObservation({...base,group:'condiments'}));
  assert.throws(() => validateObservation({...base,verified:false}));
});
test('normalizes compatible units', () => {
  assert.equal(normalizedPriceMinor(base),249.5);
  assert.equal(normalizedPriceMinor({...base,quantity:2000,unit:'ml'}),249.5);
});
test('rejects stale, future, wrong currency and wrong location', () => {
  const offers = [base,{...base,locationId:'calgary'},{...base,currency:'USD'},{...base,observedAt:'2026-10-30T18:00:00Z'},{...base,observedAt:'2026-11-02T18:00:00Z'}];
  assert.equal(compareOffers(offers,{locationId:'regina',currency:'CAD',now:Date.parse(now)}).flatMap(x=>x.offers).length,1);
});
test('sorts same product by normalized unit price', () => {
  const result=compareOffers([base,{...base,retailerId:'chain-2',priceMinor:300}],{locationId:'regina',currency:'CAD',now:Date.parse(now)});
  assert.equal(result[0].offers[0].retailerId,'chain-2');
});
