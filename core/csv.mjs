import { analyse, columns, validateRows } from './engine.mjs';
export function inspectCsv(text) {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024) throw new Error('CSV exceeds 2 MB.');
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  function cell() {
    if (row.length >= 100) throw new Error('CSV exceeds 100 columns. Export only the fields needed for review.');
    row.push(field); field = ''; closed = false;
  }
  function line() {
    cell();
    if (row.some(v => v.trim() !== '')) {
      // Include the header in this bound; ignored blank lines consume no record slots.
      if (rows.length >= 10001) throw new Error('CSV exceeds 10,000 records.');
      rows.push(row);
    }
    row = [];
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error('Malformed CSV quote.');
      quoted = true;
    } else if (c === ',') cell();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; line(); }
    else { if (closed) throw new Error('Unexpected content after quoted field.'); field += c; }
  }
  if (quoted) throw new Error('Unclosed CSV quote.');
  if (field || row.length || closed) line();
  const header = rows.shift()?.map(v => v.trim());
  if (!header || header.some(h => !h) || new Set(header).size !== header.length) throw new Error('CSV headers must be non-empty and unique.');
  rows.forEach((r, i) => { if (r.length !== header.length) throw new Error(`Row ${i + 1}: incorrect number of columns.`); });
  return { header, rows };
}
export function parseCsv(text, section) {
  if (!columns[section]) throw new Error('Unknown import type.');
  const { header } = inspectCsv(text);
  if (header.length !== columns[section].length || columns[section].some(k => !header.includes(k))) throw new Error(`Expected columns: ${columns[section].join(', ')}`);
  return parseMappedCsv(text, section, Object.fromEntries(columns[section].map(k => [k, k])));
}
export function parseMappedCsv(text, section, mapping, currencyCheck = null) {
  if (!columns[section]) throw new Error('Unknown import type.');
  const { header, rows } = inspectCsv(text);
  const required = columns[section];
  if (!mapping || Object.keys(mapping).length !== required.length || required.some(k => !Object.hasOwn(mapping, k) || !header.includes(mapping[k]))) throw new Error('Choose a source column for every required field.');
  if (currencyCheck !== null) {
    if (!currencyCheck || !header.includes(currencyCheck.column) || !['AUD', 'USD', 'GBP', 'CAD', 'NZD'].includes(currencyCheck.currency)) throw new Error('Choose a valid currency column and review currency.');
    const index = header.indexOf(currencyCheck.column);
    rows.forEach((row, i) => {
      if (row[index].trim().toUpperCase() !== currencyCheck.currency) throw new Error(`Row ${i + 1}: currency does not match the review currency. Separate currencies before importing; no conversion is performed.`);
    });
  }
  const sources = required.map(k => mapping[k]);
  if (new Set(sources).size !== sources.length) throw new Error('Each source column can be used only once.');
  const indexes = sources.map(k => header.indexOf(k));
  const result = rows.map(r => Object.fromEntries(required.map((key, i) => [key, r[indexes[i]].trim()])));
  validateRows(section, result);
  return result;
}
export function template(section) { return columns[section].join(',') + '\n'; }

// Build the replacement without mutating live state; callers commit only on success.
export function applyCsvPreview(data, preview, isDemo, asOf, target) {
  if (!preview || !columns[preview.section]) throw new Error('Unknown import type.');
  validateRows(preview.section, preview.rows);
  const base = isDemo ? Object.fromEntries(Object.keys(columns).map(key => [key, []])) : data;
  const next = structuredClone({ ...base, [preview.section]: preview.rows });
  analyse(next, asOf, target);
  return next;
}
