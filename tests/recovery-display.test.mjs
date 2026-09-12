import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryDisplay } from '../core/recovery-display.mjs';
import { actionHistoryFields } from '../core/action-history-fields.mjs';
test('recovery display distinguishes missing, zero and invalid values without currency inference', () => {
  assert.equal(recoveryDisplay(null, 'AUD'), 'Not recorded');
  assert.equal(recoveryDisplay('0', 'AUD'), 'AUD 0.00');
  assert.equal(recoveryDisplay(1230, 'GBP'), 'GBP 12.30');
  for (const amount of ['', ' ', '1e2', '1.5', -1, NaN, 100000000001, false]) assert.equal(recoveryDisplay(amount, 'AUD'), 'Unavailable');
  assert.equal(recoveryDisplay(100, null), 'Unavailable');
});
test('currency-only audit changes show both explicit monetary values', () => {
  const changes = actionHistoryFields({recovery_amount: 100, recovery_currency: 'AUD'}, {recovery_amount: 100, recovery_currency: 'USD'});
  assert.equal(changes[0].before, 'AUD 1.00');
  assert.equal(changes[0].after, 'USD 1.00');
  assert.equal(changes[1].key, 'recovery_currency');
});
