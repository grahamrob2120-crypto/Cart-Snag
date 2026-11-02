// Subscription configuration only. No payment is created or collected by this module.
// Confirm merchant settlement currency and PayPal eligibility before activating billing.
export const MEMBERSHIP_PLANS = Object.freeze({
  annual: Object.freeze({price:'10.99',currency:'CAD',interval:'YEAR',frequency:1}),
  monthly: Object.freeze({price:'0.99',currency:'CAD',interval:'MONTH',frequency:1})
});

export function paypalSandboxReady(env = {}) {
  return env.PAYPAL_MODE === 'sandbox' &&
    typeof env.PAYPAL_CLIENT_ID === 'string' && env.PAYPAL_CLIENT_ID.trim().length > 0 &&
    typeof env.PAYPAL_CLIENT_SECRET === 'string' && env.PAYPAL_CLIENT_SECRET.trim().length > 0;
}
