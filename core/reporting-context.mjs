import { dateValue, sections } from './engine.mjs';
export function reportingContext(section, start, end) {
  if (!sections.includes(section)) throw new Error('Unknown reporting section.');
  dateValue(end);
  const period = section === 'payments' || section === 'labour';
  if (period && dateValue(start) > dateValue(end)) throw new Error('Reporting start must not be after the end date.');
  return { kind: period ? 'period' : section === 'debtors' ? 'snapshot' : 'cumulative', start: period ? start : null, end };
}

export function sourceReportingLabel(source, history) {
  const entry = history.find(item => item.section === source.section && item.version === source.importVersion && item.currency === source.currency);
  if (!entry) return 'Original reporting dates not recorded.';
  const { kind, start, end } = entry.reporting;
  const label = kind === 'snapshot' ? `Balances at ${end}` : kind === 'cumulative' ? `Cumulative costs through ${end}` : `Reporting period ${start} to ${end}`;
  return `${label} · import version ${entry.version}`;
}
