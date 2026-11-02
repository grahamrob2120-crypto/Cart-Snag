import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/travel.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { evaluateTravelOffers } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const offer = (priceMinor = 400, incrementalRoundTripKm = 12) => ({storeId:'store', priceMinor, incrementalRoundTripKm});
test('fuel costs reverse a misleading shelf-price saving without mutating offers', () => {
  const offers = [{...offer(500, 0), storeId:'near'}, {...offer(), storeId:'far'}];
  const original = structuredClone(offers);
  assert.deepEqual(evaluateTravelOffers(offers, 9, 160).map(x => [x.storeId,x.travelCostMinor,x.effectiveCostMinor]), [['near',0,500],['far',173,573]]);
  assert.deepEqual(offers,original);
});
test('rejects overflow in travel cost and combined total', () => {
  assert.throws(() => evaluateTravelOffers([offer(1, 1e308)], 9, 160));
  assert.throws(() => evaluateTravelOffers([offer(Number.MAX_SAFE_INTEGER, 100)], 1, 1));
});
test('rejects invalid assumptions and offers', () => {
  for (const invalid of [-1, NaN, Infinity]) {
    assert.throws(() => evaluateTravelOffers([offer()], invalid, 160));
    assert.throws(() => evaluateTravelOffers([offer()], 9, invalid));
    assert.throws(() => evaluateTravelOffers([offer(400, invalid)], 9, 160));
    assert.throws(() => evaluateTravelOffers([offer(invalid)], 9, 160));
  }
  assert.throws(() => evaluateTravelOffers([offer(1.5)], 9, 160));
});
test('zero fuel, equal totals and empty inputs remain deterministic', () => {
  assert.deepEqual(evaluateTravelOffers([],9,160),[]);
  assert.equal(evaluateTravelOffers([offer()],0,160)[0].effectiveCostMinor,400);
  assert.deepEqual(evaluateTravelOffers([{...offer(400,0),storeId:'a'},{...offer(400,0),storeId:'b'}],9,160).map(x=>x.storeId),['a','b']);
});
