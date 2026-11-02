const WINDOWS = new Set(['09:00', '12:00', '17:00']);

/**
 * Returns an approved local-time verification window when the instant falls
 * exactly on its minute. This is scheduling policy, not a retailer connector.
 */
export function dueVerificationWindows(now, timeZone) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid time');
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map(p => [p.type, p.value]));
  const localTime = parts.hour + ':' + parts.minute;
  if (now.getUTCSeconds() !== 0 || now.getUTCMilliseconds() !== 0) return [];
  return WINDOWS.has(localTime) ? [localTime] : [];
}

export function nextHourlyRetry(now) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error('Invalid time');
  const hourMs = 60 * 60 * 1000;
  return new Date((Math.floor(now.getTime() / hourMs) + 1) * hourMs);
}
