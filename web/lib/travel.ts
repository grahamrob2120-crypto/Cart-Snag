export type TravelOffer = {
  storeId: string;
  priceMinor: number;
  incrementalRoundTripKm: number;
};
export function evaluateTravelOffers(offers: TravelOffer[], fuelLitresPer100Km: number, fuelPriceMinorPerLitre: number) {
  if (!Number.isFinite(fuelLitresPer100Km) || fuelLitresPer100Km < 0 || !Number.isFinite(fuelPriceMinorPerLitre) || fuelPriceMinorPerLitre < 0) throw new Error('Invalid travel assumptions');
  return offers.map(offer => {
    if (!Number.isSafeInteger(offer.priceMinor) || offer.priceMinor < 0 || !Number.isFinite(offer.incrementalRoundTripKm) || offer.incrementalRoundTripKm < 0) throw new Error('Invalid offer');
    const travelCostMinor = Math.round(offer.incrementalRoundTripKm * fuelLitresPer100Km / 100 * fuelPriceMinorPerLitre);
    return { ...offer, travelCostMinor, effectiveCostMinor: offer.priceMinor + travelCostMinor };
  }).sort((a,b) => a.effectiveCostMinor - b.effectiveCostMinor);
}
