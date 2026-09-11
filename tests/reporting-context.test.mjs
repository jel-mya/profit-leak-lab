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
