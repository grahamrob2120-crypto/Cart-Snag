import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
test('five food groups are defined without extra categories', () => { const page = read('../app/page.tsx'); for (const group of ['Meat','Dairy','Vegetables','Fruits','Grains']) assert.match(page, new RegExp("'"+group+"'")); assert.doesNotMatch(page, /'Spices'|'Condiments'/); });
test('membership and live pricing are not falsely advertised as active', () => assert.match(read('../app/page.tsx'), /not available on this version yet/));
test('health endpoint disables caching', () => assert.match(read('../app/api/health/route.ts'), /no-store/));
test('no secrets are embedded in starter application', () => { for (const p of ['../app/page.tsx','../app/layout.tsx','../app/api/health/route.ts']) assert.doesNotMatch(read(p), /sb_secret_|service_role|PAYPAL_CLIENT_SECRET/); });
