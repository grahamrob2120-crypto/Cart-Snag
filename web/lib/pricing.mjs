const GROUPS = new Set(['meat', 'dairy', 'vegetables', 'fruits', 'grains']);
export function validateObservation(o) {
  if (!o || typeof o !== 'object') throw new Error('Invalid observation');
  if (!GROUPS.has(o.group)) throw new Error('Unsupported food group');
  if (typeof o.productKey !== 'string' || !o.productKey.trim()) throw new Error('Invalid product');
  if (typeof o.retailerId !== 'string' || !o.retailerId.trim()) throw new Error('Invalid retailer');
  if (typeof o.locationId !== 'string' || !o.locationId.trim()) throw new Error('Invalid location');
  if (!['CAD','USD'].includes(o.currency)) throw new Error('Invalid currency');
  if (!Number.isSafeInteger(o.priceMinor) || o.priceMinor < 0) throw new Error('Invalid price');
  if (!Number.isFinite(o.quantity) || o.quantity <= 0) throw new Error('Invalid quantity');
  if (!['g','kg','ml','l','each'].includes(o.unit)) throw new Error('Invalid unit');
  if (typeof o.sourceUrl !== 'string' || !/^https:\/\//.test(o.sourceUrl)) throw new Error('Invalid source URL');
  if (!Number.isFinite(Date.parse(o.observedAt))) throw new Error('Invalid timestamp');
  if (o.verified !== true) throw new Error('Unverified price');
  return Object.freeze({...o});
}
export function normalizedPriceMinor(o) {
  validateObservation(o);
  const factor = {g:1000,kg:1,ml:1000,l:1,each:1}[o.unit];
  return o.priceMinor * factor / o.quantity;
}
export function compareOffers(observations, {locationId, currency, now = Date.now(), maxAgeMs = 60 * 60 * 1000}) {
  if (!Array.isArray(observations)) throw new Error('Invalid offers');
  const valid = [];
  for (const raw of observations) {
    try {
      const o = validateObservation(raw);
      const age = now - Date.parse(o.observedAt);
      if (o.locationId !== locationId || o.currency !== currency || age < 0 || age > maxAgeMs) continue;
      valid.push(o);
    } catch { /* Invalid offers never become deals. */ }
  }
  const grouped = new Map();
  for (const o of valid) {
    const key = [o.productKey, o.unit === 'g' || o.unit === 'kg' ? 'mass' : o.unit === 'ml' || o.unit === 'l' ? 'volume' : 'each'].join(':');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(o);
  }
  return [...grouped.entries()].map(([productKey, offers]) => ({
    productKey,
    offers: offers.sort((a,b) => normalizedPriceMinor(a) - normalizedPriceMinor(b))
  }));
}
