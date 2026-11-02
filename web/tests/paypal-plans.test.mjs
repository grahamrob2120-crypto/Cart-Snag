import test from 'node:test';
import assert from 'node:assert/strict';
import { MEMBERSHIP_PLANS, paypalSandboxReady } from '../lib/paypal-plans.mjs';

test('annual and monthly plans have exact approved amounts', () => {
  assert.deepEqual(MEMBERSHIP_PLANS.annual, {price:'10.99', currency:'CAD', interval:'YEAR', frequency:1});
  assert.deepEqual(MEMBERSHIP_PLANS.monthly, {price:'0.99', currency:'CAD', interval:'MONTH', frequency:1});
});
test('sandbox requires explicit credentials and never accepts live mode', () => {
  assert.equal(paypalSandboxReady({PAYPAL_MODE:'sandbox',PAYPAL_CLIENT_ID:'test-id',PAYPAL_CLIENT_SECRET:'test-secret'}), true);
  assert.equal(paypalSandboxReady({PAYPAL_MODE:'live',PAYPAL_CLIENT_ID:'test-id',PAYPAL_CLIENT_SECRET:'test-secret'}), false);
  assert.equal(paypalSandboxReady({PAYPAL_MODE:'sandbox',PAYPAL_CLIENT_ID:'test-id'}), false);
});
