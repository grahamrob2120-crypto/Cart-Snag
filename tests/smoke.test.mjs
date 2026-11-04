import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('Stripe is the only advertised checkout provider', () => {
  assert.match(html, /Stripe checkout/);
  assert.doesNotMatch(html + app, /PayPal/i);
});

test('checkout is not presented as functional until server integration exists', () => {
  assert.match(html, /<button[^>]*disabled[^>]*>Stripe checkout/);
});

test('receipt upload guards account and country switches', () => {
  assert.match(app, /const ownerId=user\.id,selectedCountry=country/);
  assert.match(app, /user\?\.id!==ownerId\|\|country!==selectedCountry/);
});

test('receipt submit button is restored on every settled submission', () => {
  assert.match(app, /finally\s*\{[\s\S]*?submit\.disabled=false/);
});

test('public app uses a publishable key rather than a service role key', () => {
  assert.match(app, /sb_publishable_/);
  assert.doesNotMatch(app, /service_role|sb_secret_/);
});
