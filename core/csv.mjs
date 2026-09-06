import { columns, validateRows } from './engine.mjs';
export function parseCsv(text, section) {
  if (!columns[section]) throw new Error('Unknown import type.');
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024) throw new Error('CSV exceeds 2 MB.');
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  function cell() { row.push(field); field = ''; closed = false; }
  function line() { cell(); if (row.some(v => v.trim() !== '')) rows.push(row); row = []; }
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
  if (!header || new Set(header).size !== header.length || header.length !== columns[section].length || columns[section].some(k => !header.includes(k))) throw new Error(`Expected columns: ${columns[section].join(', ')}`);
  const result = rows.map((r, i) => {
    if (r.length !== header.length) throw new Error(`Row ${i + 1}: incorrect number of columns.`);
    return Object.fromEntries(header.map((k, j) => [k, r[j].trim()]));
  });
  validateRows(section, result);
  return result;
}
export function template(section) { return columns[section].join(',') + '\n'; }
