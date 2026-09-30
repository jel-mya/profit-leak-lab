import { dateValue, money } from './engine.mjs';
import { inspectCsv } from './csv.mjs';

export const retentionHeaders = ['id', 'jobId', 'counterparty', 'held', 'released', 'releaseDueDate'];
const currencies = ['AUD', 'USD', 'GBP', 'CAD', 'NZD'];
const safeAdd = (total, amount) => {
  const result = total + amount;
  if (!Number.isSafeInteger(result)) throw new Error('Retention totals exceed safe calculation limits.');
  return result;
};
export function validateRetentionRows(rows) {
  if (!Array.isArray(rows) || rows.length > 10000) throw new Error('Retention review supports up to 10,000 rows.');
  const ids = new Set();
  return rows.map((row, index) => {
    const record = {};
    for (const key of retentionHeaders) {
      const value = row?.[key];
      if (typeof value !== 'string' || !value.trim()) throw new Error(`Row ${index + 1}: ${key} is required.`);
      if (value.trim().length > 200) throw new Error(`Row ${index + 1}: ${key} is too long.`);
      record[key] = ['held', 'released'].includes(key) ? money(value.trim()) : value.trim();
    }
    dateValue(record.releaseDueDate);
    if (record.released > record.held) throw new Error(`Row ${index + 1}: released exceeds held. Reconcile source adjustments first.`);
    if (ids.has(record.id)) throw new Error(`Row ${index + 1}: duplicate retention ID.`);
    ids.add(record.id);
    return record;
  });
}
export function parseRetentionCsv(text, currency, singleCurrencyConfirmed) {
  if (!currencies.includes(currency)) throw new Error('Choose a supported currency.');
  const { header, rows } = inspectCsv(text);
  const allowed = [...retentionHeaders, 'currency'];
  if (header.some(h => !allowed.includes(h)) || retentionHeaders.some(h => !header.includes(h))) {
    throw new Error(`Expected columns: ${retentionHeaders.join(', ')} (optional: currency).`);
  }
  if (!header.includes('currency') && singleCurrencyConfirmed !== true) {
    throw new Error('Confirm that the whole export uses the selected currency.');
  }
  const hasCurrency = header.includes('currency');
  const parsed = rows.map((row, index) => {
    const record = Object.fromEntries(retentionHeaders.map(k => [k, row[header.indexOf(k)].trim()]));
    if (hasCurrency && row[header.indexOf('currency')].trim().toUpperCase() !== currency) {
      throw new Error(`Row ${index + 1}: mixed, missing or incorrect currency code.`);
    }
    return record;
  });
  validateRetentionRows(parsed);
  return parsed;
}
export function reviewRetentions(rows, asOf) {
  const today = dateValue(asOf);
  const checked = validateRetentionRows(rows);
  const items = checked.map(row => {
    const remaining = row.held - row.released;
    const due = dateValue(row.releaseDueDate);
    const state = remaining === 0 ? 'Fully released'
      : due < today ? 'Past listed date'
      : due === today ? 'Date reached today' : 'Upcoming';
    return { ...row, remaining, state };
  });
  const total = key => items.reduce((sum, item) => safeAdd(sum, item[key]), 0);
  const reviewAmount = items.filter(item => item.remaining > 0 && dateValue(item.releaseDueDate) <= today)
    .reduce((sum, item) => safeAdd(sum, item.remaining), 0);
  const pastDateAmount = items.filter(item => item.state === 'Past listed date')
    .reduce((sum, item) => safeAdd(sum, item.remaining), 0);
  return {
    items, asOf, count: items.length, held: total('held'),
    released: total('released'), open: total('remaining'), reviewAmount, pastDateAmount,
    flaggedCount: items.filter(item => item.remaining > 0 && dateValue(item.releaseDueDate) <= today).length,
  };
}
