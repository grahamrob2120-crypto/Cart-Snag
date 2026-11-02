import { nextHourlyRetry } from './price-schedule.mjs';

export function presentPrice(offer, {now = new Date(), currency, maxAgeMs = 60 * 60 * 1000} = {}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid time');
  if (!['CAD','USD'].includes(currency)) throw new Error('Invalid currency');
  const age = offer && typeof offer.observedAt === 'string' ? now.getTime() - Date.parse(offer.observedAt) : NaN;
  const valid = offer && offer.verified === true && offer.currency === currency &&
    Number.isSafeInteger(offer.priceMinor) && offer.priceMinor >= 0 &&
    Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
  if (!valid) return {
    label: 'Unavailable at this time', available: false, priceMinor: null,
    retryAt: nextHourlyRetry(now).toISOString()
  };
  return {
    label: new Intl.NumberFormat('en-CA', {style:'currency',currency,currencyDisplay:'code'}).format(offer.priceMinor / 100).replace(/^CAD\\s*/, 'CA,
    available: true, priceMinor: offer.priceMinor, retryAt: null
  };
}
).replace(/^USD\\s*/, 'US,
    available: true, priceMinor: offer.priceMinor, retryAt: null
  };
}
),
    available: true, priceMinor: offer.priceMinor, retryAt: null
  };
}
