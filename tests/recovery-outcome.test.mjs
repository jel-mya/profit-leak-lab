import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryOutcome } from '../core/recovery-outcome.mjs';
test('user-reported recovery requires explicit amount, date, currency and evidence', () => {
  assert.deepEqual(recoveryOutcome('12.30', 'AUD', '2026-09-11', ' Synthetic bank receipt '), {amountMinorUnits: 1230, currency: 'AUD', date: '2026-09-11', evidence: 'Synthetic bank receipt', verification: 'user-reported'});
  for (const amount of ['', '-1', '1.001', '1e4']) assert.throws(() => recoveryOutcome(amount, 'AUD', '2026-09-11', 'Receipt'));
  assert.throws(() => recoveryOutcome('1', 'EUR', '2026-09-11', 'Receipt'));
  assert.throws(() => recoveryOutcome('1', 'AUD', '2026-02-30', 'Receipt'));
  assert.throws(() => recoveryOutcome('1', 'AUD', '2026-09-11', ' '));
  assert.equal(recoveryOutcome('0', 'AUD', '2026-09-11', 'Corrected: no recovery').amountMinorUnits, 0);
});

test('recovery corrections retain detached before/after evidence and skip unchanged saves', async () => {
  const { recoveryRevision } = await import('../core/recovery-outcome.mjs');
  const first = recoveryOutcome('10', 'AUD', '2026-09-11', 'Synthetic receipt');
  const initial = recoveryRevision([], undefined, first, '2026-09-11T01:00:00Z');
  const corrected = recoveryOutcome('0', 'AUD', '2026-09-11', 'Corrected: receipt unrelated');
  const revisions = recoveryRevision(initial, first, corrected, '2026-09-11T02:00:00Z');
  assert.equal(revisions.length, 2);
  assert.equal(revisions[0].before, null);
  assert.equal(revisions[1].before.amountMinorUnits, 1000);
  assert.equal(revisions[1].after.amountMinorUnits, 0);
  assert.equal(initial.length, 1);
  first.evidence = 'changed outside history';
  corrected.evidence = 'changed outside history';
  assert.equal(revisions[0].after.evidence, 'Synthetic receipt');
  assert.equal(revisions[1].after.evidence, 'Corrected: receipt unrelated');
  assert.equal(recoveryRevision(revisions, revisions[1].after, revisions[1].after, 'later'), revisions);
});
