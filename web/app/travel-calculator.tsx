'use client';
import { useMemo, useState } from 'react';
import { evaluateTravelOffers } from '../lib/travel';
export default function TravelCalculator() {
  const [near, setNear] = useState('5.00');
  const [far, setFar] = useState('4.00');
  const [km, setKm] = useState('12');
  const [fuelUse, setFuelUse] = useState('9');
  const [fuelPrice, setFuelPrice] = useState('1.60');
  const values = [near, far, km, fuelUse, fuelPrice];
  const result = useMemo(() => {
    if (values.some(v => v.trim() === '' || !Number.isFinite(Number(v)) || Number(v) < 0)) return null;
    try {
      return evaluateTravelOffers([
      {storeId:'Closer store', priceMinor:Math.round(Number(near)*100), incrementalRoundTripKm:0},
      {storeId:'Farther store', priceMinor:Math.round(Number(far)*100), incrementalRoundTripKm:Number(km)}
    ], Number(fuelUse), Math.round(Number(fuelPrice)*100));
    } catch {
      return null;
    }
  }, [near, far, km, fuelUse, fuelPrice]);
  const inputs = [
    {label:'Closer store price',value:near,update:setNear},
    {label:'Farther store price',value:far,update:setFar},
    {label:'Extra round-trip kilometres',value:km,update:setKm},
    {label:'Fuel consumption (L/100 km)',value:fuelUse,update:setFuelUse},
    {label:'Fuel price per litre',value:fuelPrice,update:setFuelPrice}
  ];
  const money = (minor:number) => '$' + (minor / 100).toFixed(2);
  return <section aria-labelledby="travel-title" className="mt-8 rounded-xl border-2 border-[#d9ad37] bg-[#09266c] p-6">
    <h2 id="travel-title" className="font-serif text-2xl font-bold text-[#f8d76e]">🚗 Travel-cost deal checker</h2>
    <p className="mt-2 text-sm">Enter two prices and the extra round-trip distance to see which store really costs less.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {inputs.map(input => <label key={input.label} className="text-sm font-semibold">{input.label}<input type="number" min="0" step="any" value={input.value} onChange={event => input.update(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#d9ad37] bg-white p-3 text-[#091b52]"/></label>)}
    </div>
    {result ? <div aria-live="polite" className="mt-5 rounded-xl bg-white p-5 text-[#071b58]">
      <p className="text-lg font-black">Best overall: {result[0].storeId}</p>
      {result.map(item => <p key={item.storeId} className="mt-1 text-sm">{item.storeId}: {money(item.effectiveCostMinor)} total (extra fuel: {money(item.travelCostMinor)})</p>)}
      <p className="mt-2 font-bold">Estimated savings: {money(result[1].effectiveCostMinor - result[0].effectiveCostMinor)}</p>
    </div> : <p role="alert" className="mt-4 text-amber-200">Enter valid non-negative numbers within the supported calculation range.</p>}
    <p className="mt-3 text-xs text-[#eadba7]">Manual estimate, not live routing or pricing. Excludes parking, vehicle wear and travel time.</p>
  </section>;
}
