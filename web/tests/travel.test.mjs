import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const travel = readFileSync(new URL('../lib/travel.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const calculator = readFileSync(new URL('../app/travel-calculator.tsx', import.meta.url), 'utf8');
test('travel logic includes extra round trip distance and fuel consumption',()=>{
  assert.match(travel,/incrementalRoundTripKm \* fuelLitresPer100Km \/ 100 \* fuelPriceMinorPerLitre/);
  assert.match(travel,/effectiveCostMinor: offer.priceMinor \+ travelCostMinor/);
});
test('travel calculator is rendered on member storefront',()=>{
  assert.match(page,/<TravelCalculator \/>/);
  assert.match(calculator,/evaluateTravelOffers/);
  assert.match(calculator,/Manual estimate, not live routing or pricing/);
});
