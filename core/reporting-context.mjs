import { applyCsvPreview } from './csv.mjs';
import { dateValue, sections } from './engine.mjs';
export function reportingContext(section, start, end, context = '') {
  if (!sections.includes(section)) throw new Error('Unknown reporting section.');
  if (typeof context !== 'string' || context.trim().length > 500) throw new Error('Source report context must be at most 500 characters.');
  dateValue(end);
  const period = section === 'payments' || section === 'labour';
  if (period && dateValue(start) > dateValue(end)) throw new Error('Reporting start must not be after the end date.');
  return { kind: period ? 'period' : section === 'debtors' ? 'snapshot' : 'cumulative', start: period ? start : null, end, ...(context.trim() ? { context: context.trim() } : {}) };
}

export function sourceReportingLabel(source, history) {
  const entry = history.find(item => item.section === source.section && item.version === source.importVersion && item.currency === source.currency);
  if (!entry) return 'Original reporting dates not recorded.';
  return `${reportingLabel(entry.reporting)} · import version ${entry.version}`;
}

export function reportingLabel({ kind, start, end, context }) {
  const label = kind === 'snapshot' ? `Balances at ${end}` : kind === 'cumulative' ? `Cumulative costs through ${end}` : `Reporting period ${start} to ${end}`;
  return context ? `${label} · ${context}` : label;
}

export function prepareReportingImport(data, preview, isDemo, asOf, target, currency, version) {
  if (!Number.isSafeInteger(version) || version < 1 || !['AUD', 'USD', 'GBP', 'CAD', 'NZD'].includes(currency)) throw new Error('Invalid import version or currency.');
  const reporting = reportingContext(preview.section, preview.start, preview.end, preview.context);
  const next = applyCsvPreview(data, preview, isDemo, asOf, target);
  return { data: next, entry: { section: preview.section, version, reporting, count: preview.rows.length, currency } };
}

// One identity spans asynchronous work and edits to its staged metadata.
export function createImportIdentity() {
  let current = 0;
  return {
    next() { return ++current; },
    isCurrent(id) { return id === current; },
    edit(preview, id, patch) {
      return id === current && preview?.generation === id ? { ...preview, ...patch } : preview;
    },
  };
}
