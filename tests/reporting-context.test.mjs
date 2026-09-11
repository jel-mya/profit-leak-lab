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
