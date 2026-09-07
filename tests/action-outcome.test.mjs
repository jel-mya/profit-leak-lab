import test from 'node:test';
import assert from 'node:assert/strict';
import { requireActionOutcome } from '../core/action-outcome.mjs';
test('closed action statuses require a nonblank outcome while open statuses permit drafts', () => {
  for (const status of ['Resolved', 'Dismissed']) {
    for (const note of ['', ' ', '\t\r\n', null]) assert.throws(() => requireActionOutcome(status, note));
    assert.doesNotThrow(() => requireActionOutcome(status, 'Synthetic: checked against supplier statement.'));
  }
  for (const status of ['Open', 'Investigating']) assert.doesNotThrow(() => requireActionOutcome(status, ''));
  assert.throws(() => requireActionOutcome('Paid', 'Not a supported status'));
});
