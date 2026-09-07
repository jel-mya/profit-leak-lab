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
