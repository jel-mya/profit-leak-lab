import test from 'node:test';
import assert from 'node:assert/strict';
import { filterActions } from '../core/action-filter.mjs';
test('overdue follow-ups exclude due-today, future, undated and closed actions', () => {
  const actions = [
    {id: 'late', status: 'Open', due: '2026-09-10'},
    {id: 'today', status: 'Investigating', due: '2026-09-11'},
    {id: 'future', status: 'Open', due: '2026-09-12'},
    {id: 'undated', status: 'Open', due: ''},
    {id: 'resolved', status: 'Resolved', due: '2026-09-01'},
    {id: 'dismissed', status: 'Dismissed', due: '2026-09-01'},
    {id: 'invalid', status: 'Open', due: '2026-02-30'},
  ];
  const before = structuredClone(actions);
  assert.deepEqual(filterActions(actions, 'Overdue', '2026-09-11').map(a => a.id), ['late']);
  assert.equal(filterActions(actions, 'Unfinished', '2026-09-11').length, 5);
  assert.equal(filterActions(actions, 'Closed', '2026-09-11').length, 2);
  assert.equal(filterActions(actions, 'All actions', '2026-09-11').length, 7);
  assert.deepEqual(actions, before);
  assert.throws(() => filterActions(actions, 'missing', '2026-09-11'));
});
