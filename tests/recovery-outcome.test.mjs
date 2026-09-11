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
