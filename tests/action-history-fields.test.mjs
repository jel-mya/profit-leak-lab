import test from 'node:test';
import assert from 'node:assert/strict';
import { actionHistoryFields } from '../core/action-history-fields.mjs';

test('recovery-only audit corrections retain zero, explicit units and evidence changes', () => {
  const before = {title: 'Synthetic review', recovery_amount: 1230, recovery_currency: 'AUD', recovery_evidence: 'Synthetic receipt'};
  const after = {...before, recovery_amount: 0, recovery_evidence: 'Synthetic correction'};
  const unchanged = structuredClone(before);
  assert.deepEqual(actionHistoryFields(before, after), [
    {key: 'recovery_amount', label: 'Reported recovery', before: 'AUD 12.30', after: 'AUD 0.00'},
    {key: 'recovery_evidence', label: 'Recovery evidence', before: 'Synthetic receipt', after: 'Synthetic correction'},
  ]);
  assert.deepEqual(before, unchanged);
});
test('legacy missing recovery fields equal null, while baselines show explicit missing values', () => {
  assert.deepEqual(actionHistoryFields({title: 'Synthetic'}, {title: 'Synthetic', recovery_amount: null}), []);
  const baseline = actionHistoryFields(null, {title: 'Synthetic', recovery_amount: '0', recovery_currency: 'AUD'});
  assert.equal(baseline.find(f => f.key === 'recovery_amount').after, 'AUD 0.00');
  assert.equal(baseline.find(f => f.key === 'recovery_date').after, 'Not set');
  assert.ok(baseline.every(f => f.before === null));
});
