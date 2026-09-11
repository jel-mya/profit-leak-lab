import { sections, dateValue } from './engine.mjs';
export function actionSource(section, ids, amount, currency, asOf, target, version) {
  if (!sections.includes(section) || !Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id || id.length > 200) || new Set(ids).size !== ids.length) throw new Error('Invalid source identity.');
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(version) || version < 0 || !['AUD', 'USD', 'GBP', 'CAD', 'NZD'].includes(currency) || !Number.isFinite(target) || target < 0 || target > 100) throw new Error('Invalid source review context.');
  dateValue(asOf);
  const recordIds = [...ids].sort();
  return { key: JSON.stringify([section, recordIds]), section, recordIds, amountMinorUnits: amount, currency, asOf, targetMargin: target, importVersion: version };
}
export function sourceReviewStatus(source, versions, currency, asOf, target) {
  if (source.importVersion !== versions[source.section]) return 'Source reimported — review again';
  if (source.currency !== currency || source.asOf !== asOf || (source.section === 'jobs' && source.targetMargin !== target)) return 'Review settings changed — review again';
  return 'Linked to the current source review';
}

export function sourceIndex(data) {
  return Object.fromEntries(sections.map(section => [section, new Set((data[section] ?? []).map(row => String(row.id)))]));
}
export function sourcePresence(source, index) {
  const ids = index[source.section] ?? new Set();
  const missing = source.recordIds.filter(id => !ids.has(id)).length;
  if (missing) return `${missing} of ${source.recordIds.length} original source records are absent from the loaded section. Check export coverage and ID changes; absence does not confirm resolution or recovery.`;
  return 'All original source IDs are present. Values or exception conditions may have changed; review the current records.';
}

export function findingKeys(result) {
  const keys = new Set();
  const add = (section, ids) => keys.add(JSON.stringify([section, [...ids].sort()]));
  result.jobs.filter(row => row.shortfall > 0).forEach(row => add('jobs', [row.id]));
  result.debtors.filter(row => row.days > 0 && row.outstanding > 0).forEach(row => add('debtors', [row.id]));
  result.labour.filter(row => row.exposure > 0).forEach(row => add('labour', [row.id]));
  result.duplicates.forEach(row => add('payments', row.paymentIds));
  return keys;
}
