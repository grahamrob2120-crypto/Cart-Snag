import test from 'node:test';
import assert from 'node:assert/strict';
import { presentPrice } from '../lib/price-presentation.mjs';

test('missing price is visible and scheduled for retry', () => {
  assert.deepEqual(presentPrice(null, {now: new Date('2026-11-02T18:05:00Z'), currency:'CAD'}), {
    label:'Unavailable at this time', available:false, priceMinor:null, retryAt:'2026-11-02T19:00:00.000Z'
  });
});
test('verified valid price is shown with currency and no retry', () => {
  const value = presentPrice({priceMinor:499,currency:'CAD',verified:true,observedAt:'2026-11-02T18:00:00Z'}, {now:new Date('2026-11-02T18:05:00Z'),currency:'CAD'});
  assert.equal(value.label,'CA$4.99');
  assert.equal(value.retryAt,null);
});
test('unverified, stale, and wrong-currency offers cannot appear as prices', () => {
  const opts={now:new Date('2026-11-02T18:05:00Z'),currency:'CAD'};
  for (const offer of [
    {priceMinor:499,currency:'CAD',verified:false,observedAt:'2026-11-02T18:00:00Z'},
    {priceMinor:499,currency:'CAD',verified:true,observedAt:'2026-11-01T18:00:00Z'},
    {priceMinor:499,currency:'USD',verified:true,observedAt:'2026-11-02T18:00:00Z'},
    {priceMinor:-1,currency:'CAD',verified:true,observedAt:'2026-11-02T18:00:00Z'}
  ]) assert.equal(presentPrice(offer,opts).label,'Unavailable at this time');
});
