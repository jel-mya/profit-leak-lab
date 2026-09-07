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
