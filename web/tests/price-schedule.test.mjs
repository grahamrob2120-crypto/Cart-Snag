import test from 'node:test';
import assert from 'node:assert/strict';
import { dueVerificationWindows, nextHourlyRetry } from '../lib/price-schedule.mjs';

test('checks only the three approved local verification windows', () => {
  const now = new Date('2026-11-02T18:00:00Z'); // noon in Regina (UTC-6)
  assert.deepEqual(dueVerificationWindows(now, 'America/Regina'), ['12:00']);
  assert.deepEqual(dueVerificationWindows(new Date('2026-11-02T18:01:00Z'), 'America/Regina'), []);
  assert.deepEqual(dueVerificationWindows(new Date('2026-11-02T15:00:00Z'), 'America/Regina'), ['09:00']);
  assert.deepEqual(dueVerificationWindows(new Date('2026-11-02T23:00:00Z'), 'America/Regina'), ['17:00']);
});
test('uses local time and handles daylight saving changes', () => {
  assert.deepEqual(dueVerificationWindows(new Date('2026-07-01T13:00:00Z'), 'America/Toronto'), ['09:00']);
  assert.deepEqual(dueVerificationWindows(new Date('2026-01-01T14:00:00Z'), 'America/Toronto'), ['09:00']);
});
test('unavailable prices retry at the next whole hour', () => {
  assert.equal(nextHourlyRetry(new Date('2026-11-02T18:05:00Z')).toISOString(), '2026-11-02T19:00:00.000Z');
  assert.equal(nextHourlyRetry(new Date('2026-11-02T18:00:00Z')).toISOString(), '2026-11-02T19:00:00.000Z');
});
test('invalid input never schedules a check', () => {
  assert.throws(() => dueVerificationWindows(new Date('invalid'), 'America/Regina'));
  assert.throws(() => dueVerificationWindows(new Date(), 'Invalid/Zone'));
  assert.throws(() => nextHourlyRetry(new Date('invalid')));
});
