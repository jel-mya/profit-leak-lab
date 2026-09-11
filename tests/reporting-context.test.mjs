import test from 'node:test';
import assert from 'node:assert/strict';
import { reportingContext } from '../core/reporting-context.mjs';
test('reporting context distinguishes snapshots, cumulative costs and transaction periods', () => {
  assert.deepEqual(reportingContext('debtors', '', '2026-09-01'), { kind: 'snapshot', start: null, end: '2026-09-01' });
  assert.equal(reportingContext('jobs', '', '2026-09-01').kind, 'cumulative');
  for (const section of ['payments', 'labour']) {
    assert.equal(reportingContext(section, '2026-08-01', '2026-09-01').start, '2026-08-01');
    assert.throws(() => reportingContext(section, '', '2026-09-01'));
    assert.throws(() => reportingContext(section, '2026-09-02', '2026-09-01'));
  }
});
test('reporting context never accepts missing, inferred or impossible dates', () => {
  for (const end of ['', '2026-02-30', 'September', undefined]) assert.throws(() => reportingContext('debtors', '', end));
  assert.throws(() => reportingContext('unknown', '', '2026-09-01'));
});

test('tracked reporting dates stay linked to the original section, version and currency', async () => {
  const { sourceReportingLabel } = await import('../core/reporting-context.mjs');
  const source = { section: 'debtors', importVersion: 1, currency: 'AUD' };
  const history = [
    { section: 'jobs', version: 1, currency: 'AUD', reporting: reportingContext('jobs', '', '2026-07-31') },
    { section: 'debtors', version: 1, currency: 'AUD', reporting: reportingContext('debtors', '', '2026-08-31') },
    { section: 'debtors', version: 2, currency: 'AUD', reporting: reportingContext('debtors', '', '2026-09-30') },
  ];
  assert.equal(sourceReportingLabel(source, history), 'Balances at 2026-08-31 · import version 1');
  assert.equal(sourceReportingLabel({ ...source, currency: 'USD' }, history), 'Original reporting dates not recorded.');
  assert.equal(sourceReportingLabel({ ...source, importVersion: 0 }, history), 'Original reporting dates not recorded.');
  assert.equal(sourceReportingLabel(source, []), 'Original reporting dates not recorded.');
});

test('reporting import validates records and metadata together without mutating live inputs', async () => {
  const { prepareReportingImport } = await import('../core/reporting-context.mjs');
  const data = { debtors: [{ id: 'old', customer: 'Synthetic', dueDate: '2026-09-01', outstanding: '10' }] };
  const preview = { section: 'debtors', start: '', end: '2026-09-01', rows: [{ id: 'new', customer: 'Synthetic', dueDate: '2026-09-01', outstanding: '20' }] };
  const before = structuredClone(data);
  for (const invalid of [{ ...preview, end: '' }, { ...preview, rows: [{ ...preview.rows[0], outstanding: '-1' }] }]) {
    assert.throws(() => prepareReportingImport(data, invalid, false, '2026-09-11', 25, 'AUD', 2));
    assert.deepEqual(data, before);
  }
  const prepared = prepareReportingImport(data, preview, false, '2026-09-11', 25, 'AUD', 2);
  assert.equal(prepared.entry.version, 2);
  assert.equal(prepared.entry.reporting.end, '2026-09-01');
  assert.equal(prepared.entry.count, 1);
  prepared.data.debtors[0].id = 'changed';
  assert.equal(preview.rows[0].id, 'new');
  assert.deepEqual(data, before);
  assert.throws(() => prepareReportingImport(data, preview, false, '2026-09-11', 25, 'AUD', Number.MAX_SAFE_INTEGER + 1));
});

test('source context is validated and preserved in applied history and action JSON', async () => {
  const { prepareReportingImport, sourceReportingLabel } = await import('../core/reporting-context.mjs');
  const preview = { section: 'jobs', start: '', end: '2026-08-31', context: '  All branches, cumulative since job start  ', rows: [] };
  const prepared = prepareReportingImport({}, preview, false, '2026-09-12', 25, 'AUD', 1);
  preview.context = 'Changed draft';
  const downloaded = JSON.parse(JSON.stringify({ importHistory: [prepared.entry] }));
  assert.equal(downloaded.importHistory[0].reporting.context, 'All branches, cumulative since job start');
  assert.equal(sourceReportingLabel({ section: 'jobs', importVersion: 1, currency: 'AUD' }, downloaded.importHistory), 'Cumulative costs through 2026-08-31 · All branches, cumulative since job start · import version 1');
  assert.throws(() => reportingContext('jobs', '', '2026-08-31', 'x'.repeat(501)));
  assert.throws(() => reportingContext('jobs', '', '2026-08-31', {}));
});

test('cancelled import identity cannot publish or edit staged reporting metadata', async () => {
  const { createImportIdentity } = await import('../core/reporting-context.mjs');
  const identity = createImportIdentity();
  const generation = identity.next();
  const old = { generation, start: '', end: '2026-08-31', context: 'Old snapshot' };
  identity.next(); // Same invalidation used by Cancel, section change and unmount.
  assert.equal(identity.isCurrent(generation), false);
  assert.equal(identity.edit(null, generation, old), null);
  assert.equal(identity.edit(old, generation, { end: '2026-09-01' }), old);
});

test('replacement import ignores stale completions and queued metadata edits', async () => {
  const { createImportIdentity } = await import('../core/reporting-context.mjs');
  const identity = createImportIdentity();
  const first = identity.next();
  const old = { generation: first, end: '2026-08-31', context: 'Old report' };
  const second = identity.next();
  const replacement = { generation: second, end: '', context: '' };
  assert.equal(identity.isCurrent(first), false);
  assert.equal(identity.isCurrent(second), true);
  assert.equal(identity.edit(replacement, first, old), replacement);
  assert.equal(identity.edit(old, second, { context: 'Wrong preview' }), old);
  assert.deepEqual(identity.edit(replacement, second, { end: '2026-09-10', context: 'New report' }), { generation: second, end: '2026-09-10', context: 'New report' });
  assert.deepEqual(replacement, { generation: second, end: '', context: '' });
});
