import { money, dateValue } from './engine.mjs';
export function recoveryOutcome(amount, currency, date, evidence) {
  if (!['AUD', 'USD', 'GBP', 'CAD', 'NZD'].includes(currency)) throw new Error('Choose a supported recovery currency.');
  dateValue(date);
  if (typeof evidence !== 'string' || !evidence.trim() || evidence.length > 1000) throw new Error('Describe the recovery evidence using 1–1,000 characters.');
  return { amountMinorUnits: money(amount), currency, date, evidence: evidence.trim(), verification: 'user-reported' };
}

export function recoveryRevision(history, before, after, recordedAt) {
  if (JSON.stringify(before ?? null) === JSON.stringify(after)) return history;
  return [...history, structuredClone({ revision: history.length + 1, recordedAt, before: before ?? null, after })];
}
