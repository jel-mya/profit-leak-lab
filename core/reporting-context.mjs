import { dateValue, sections } from './engine.mjs';
export function reportingContext(section, start, end) {
  if (!sections.includes(section)) throw new Error('Unknown reporting section.');
  dateValue(end);
  const period = section === 'payments' || section === 'labour';
  if (period && dateValue(start) > dateValue(end)) throw new Error('Reporting start must not be after the end date.');
  return { kind: period ? 'period' : section === 'debtors' ? 'snapshot' : 'cumulative', start: period ? start : null, end };
}
