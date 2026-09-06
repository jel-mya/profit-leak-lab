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
