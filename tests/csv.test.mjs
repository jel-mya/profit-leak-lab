import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, template } from '../core/csv.mjs';
test('CSV supports BOM, CRLF, quoted commas and escaped quotes', () => {
  const csv = '\uFEFFid,customer,dueDate,outstanding\r\nD1,"Example, ""Ltd""",2026-09-01,12.30\r\n';
  assert.equal(parseCsv(csv, 'debtors')[0].customer, 'Example, "Ltd"');
});
test('headers can be reordered but must match exactly once', () => {
  assert.equal(parseCsv('customer,id,outstanding,dueDate\nDemo,D1,20,2026-09-01', 'debtors')[0].id, 'D1');
  assert.throws(() => parseCsv('id,id,dueDate,outstanding\n1,2,2026-09-01,3', 'debtors'));
  assert.throws(() => parseCsv('id,customer,dueDate,outstanding,secret', 'debtors'));
});
test('malformed quotes and row widths are rejected', () => {
  for (const row of ['D1,"broken,2026-09-01,1', 'D1,"Demo"oops,2026-09-01,1', 'D1,Demo,2026-09-01']) assert.throws(() => parseCsv(template('debtors') + row, 'debtors'));
});
test('blank rows are ignored and header-only input is an explicit empty dataset', () => {
  assert.deepEqual(parseCsv(template('jobs') + '\n\r\n', 'jobs'), []);
});
test('2 MB ceiling applies to encoded bytes', () => assert.throws(() => parseCsv('é'.repeat(1024 * 1024 + 1), 'jobs'), /2 MB/));
test('formula-shaped amounts are rejected; text is retained as inert data', () => {
  assert.throws(() => parseCsv(template('debtors') + 'D1,Example,2026-09-01,=2+2', 'debtors'));
  assert.equal(parseCsv(template('debtors') + 'D1,<script>alert(1)</script>,2026-09-01,20', 'debtors')[0].customer, '<script>alert(1)</script>');
});

test('applying a reviewed file replaces only its section without mutating source state', async () => {
  const { applyCsvPreview } = await import('../core/csv.mjs');
  const data = { jobs: [], debtors: [{ id: 'old', customer: 'Synthetic', dueDate: '2026-09-01', outstanding: '1' }], payments: [], labour: [] };
  const preview = { section: 'debtors', rows: parseCsv(template('debtors') + 'new,Synthetic,2026-09-01,2', 'debtors') };
  const next = applyCsvPreview(data, preview, false, '2026-09-07', 25);
  assert.equal(next.debtors[0].id, 'new');
  assert.equal(data.debtors[0].id, 'old');
  next.debtors[0].customer = 'Changed';
  assert.equal(preview.rows[0].customer, 'Synthetic');
});
test('first reviewed import clears all demo sections and header-only preview clears its section', async () => {
  const { applyCsvPreview } = await import('../core/csv.mjs');
  const { demo } = await import('../core/demo.mjs');
  const next = applyCsvPreview(demo, { section: 'debtors', rows: [] }, true, '2026-09-07', 25);
  assert.ok(Object.values(next).every(rows => rows.length === 0));
  assert.ok(demo.jobs.length > 0);
  const emptySection = applyCsvPreview(demo, { section: 'debtors', rows: [] }, false, '2026-09-07', 25);
  assert.equal(emptySection.debtors.length, 0);
  assert.deepEqual(emptySection.jobs, demo.jobs);
});
test('invalid preview fails without modifying any live records', async () => {
  const { applyCsvPreview } = await import('../core/csv.mjs');
  const { demo } = await import('../core/demo.mjs');
  const before = structuredClone(demo);
  assert.throws(() => applyCsvPreview(demo, { section: 'debtors', rows: [{ id: 'bad' }] }, false, '2026-09-07', 25));
  assert.deepEqual(demo, before);
});

test('explicit mapping accepts reordered export headers and discards unselected columns', async () => {
  const { parseMappedCsv } = await import('../core/csv.mjs');
  const text = 'Contact,Invoice number,Balance,Due,Unused\nSynthetic,D1,12.30,2026-09-01,not imported';
  const rows = parseMappedCsv(text, 'debtors', { id: 'Invoice number', customer: 'Contact', outstanding: 'Balance', dueDate: 'Due' });
  assert.deepEqual(rows, [{ id: 'D1', customer: 'Synthetic', dueDate: '2026-09-01', outstanding: '12.30' }]);
  assert.equal(JSON.stringify(rows).includes('not imported'), false);
});
test('mapping rejects missing, reused and unknown source columns', async () => {
  const { parseMappedCsv } = await import('../core/csv.mjs');
  const text = template('debtors') + 'D1,Synthetic,2026-09-01,12';
  const mapping = { id: 'id', customer: 'customer', dueDate: 'dueDate', outstanding: 'outstanding' };
  for (const bad of [{ ...mapping, id: '' }, { ...mapping, id: 'customer' }, { ...mapping, id: 'missing' }, { ...mapping, extra: 'id' }, {}]) assert.throws(() => parseMappedCsv(text, 'debtors', bad));
});
test('mapped records retain date, amount and unique identifier validation', async () => {
  const { parseMappedCsv } = await import('../core/csv.mjs');
  const header = 'Number,Name,Due,Balance\n';
  const mapping = { id: 'Number', customer: 'Name', dueDate: 'Due', outstanding: 'Balance' };
  for (const row of ['D1,Synthetic,01/09/2026,12', 'D1,Synthetic,2026-09-01,$12', 'D1,Synthetic,2026-09-01,-12', 'D1,Synthetic,2026-09-01,12\nD1,Synthetic,2026-09-01,12']) assert.throws(() => parseMappedCsv(header + row, 'debtors', mapping));
  assert.deepEqual(parseMappedCsv(header, 'debtors', mapping), []);
});
test('inspection rejects ambiguous headers, oversized row counts and malformed unused columns', async () => {
  const { inspectCsv } = await import('../core/csv.mjs');
  for (const csv of ['Name,Name\n1,2', 'Name, \n1,2', 'Name,Other\n1', Array.from({ length: 101 }, (_, i) => `C${i}`).join(','), 'Name\n' + 'row\n'.repeat(10001)]) assert.throws(() => inspectCsv(csv));
  assert.deepEqual(inspectCsv('\uFEFFA,B\r\n"a,b",c'), { header: ['A', 'B'], rows: [['a,b', 'c']] });
});

test('optional currency checking validates every row without converting or importing metadata', async () => {
  const { parseMappedCsv } = await import('../core/csv.mjs');
  const mapping = { id: 'id', customer: 'customer', dueDate: 'dueDate', outstanding: 'outstanding' };
  const header = 'id,customer,dueDate,outstanding,Currency\n';
  const row = 'D1,Synthetic,2026-09-01,12.30,';
  const check = { column: 'Currency', currency: 'AUD' };
  const result = parseMappedCsv(header + row + ' aud ', 'debtors', mapping, check);
  assert.equal(result[0].outstanding, '12.30');
  assert.equal('Currency' in result[0], false);
  for (const code of ['USD', '', '$', 'Australian dollar']) assert.throws(() => parseMappedCsv(header + row + code, 'debtors', mapping, check), /Row 1: currency/);
  assert.throws(() => parseMappedCsv(header + row + 'AUD\nD2,Synthetic,2026-09-01,5,NZD', 'debtors', mapping, check), /Row 2: currency/);
  assert.throws(() => parseMappedCsv(header + row + 'AUD', 'debtors', mapping, { column: 'missing', currency: 'AUD' }), /valid currency/);
  assert.deepEqual(parseMappedCsv(header, 'debtors', mapping, check), []);
});

test('payment import rejects masked invoice references before showing a valid preview', () => {
  assert.throws(() => parseCsv(template('payments') + 'P1,S1,Fictional,***,10', 'payments'), /letters or numbers/);
  assert.equal(parseCsv(template('payments') + 'P1,S1,Fictional,INV-1,10', 'payments')[0].invoice, 'INV-1');
});
