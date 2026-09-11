import test from 'node:test';
import assert from 'node:assert/strict';
import { actionSource, sourceReviewStatus } from '../core/action-source.mjs';
const make = (section = 'payments', ids = ['P2', 'P1']) => actionSource(section, ids, 125000, 'AUD', '2026-09-07', 25, 1);
test('source identity is stable across row order and cannot collide through separators', () => {
  assert.equal(make().key, make('payments', ['P1', 'P2']).key);
  assert.notEqual(make('payments', ['a:b', 'c']).key, make('payments', ['a', 'b:c']).key);
  assert.notEqual(make('jobs', ['P1']).key, make('debtors', ['P1']).key);
});
test('tracking captures original review context without retaining a mutable identifier array', () => {
  const ids = ['P2', 'P1'];
  const source = make('payments', ids);
  ids[0] = 'changed';
  assert.deepEqual(source.recordIds, ['P1', 'P2']);
  assert.equal(source.amountMinorUnits, 125000);
  assert.equal(source.currency, 'AUD');
  assert.equal(source.asOf, '2026-09-07');
  assert.equal(source.importVersion, 1);
});
test('source reimport and settings changes require review without implying resolution', () => {
  const source = make();
  assert.equal(sourceReviewStatus(source, { payments: 1 }, 'AUD', '2026-09-07', 30), 'Linked to the current source review');
  assert.match(sourceReviewStatus(source, { payments: 2 }, 'AUD', '2026-09-07', 25), /reimported/);
  assert.match(sourceReviewStatus(source, { payments: 1 }, 'USD', '2026-09-07', 25), /settings changed/);
  assert.match(sourceReviewStatus(source, { payments: 1 }, 'AUD', '2026-09-08', 25), /settings changed/);
  assert.match(sourceReviewStatus(make('jobs', ['J1']), { jobs: 1 }, 'AUD', '2026-09-07', 30), /settings changed/);
  assert.equal(source.importVersion, 1);
});
test('invalid source identity or financial context is rejected', () => {
  for (const ids of [[], ['P1', 'P1'], [''], [null]]) assert.throws(() => make('payments', ids));
  assert.throws(() => make('unknown', ['P1']));
  for (const amount of [-1, 1.5, NaN]) assert.throws(() => actionSource('payments', ['P1'], amount, 'AUD', '2026-09-07', 25, 1));
  assert.throws(() => actionSource('payments', ['P1'], 1, 'AUD', '2026-02-30', 25, 1));
});

test('source presence distinguishes missing records without changing the tracked evidence', async () => {
  const { sourcePresence } = await import('../core/action-source.mjs');
  const source = actionSource('payments', ['p1', 'p2'], 1000, 'AUD', '2026-09-01', 25, 1);
  const before = structuredClone(source);
  assert.match(sourcePresence(source, { payments: [{ id: 'p2', amount: 0 }, { id: 'p1', amount: 0 }] }), /All original source IDs/);
  assert.match(sourcePresence(source, { payments: [{ id: 'p1' }] }), /1 of 2 original/);
  assert.match(sourcePresence(source, { jobs: [{ id: 'p1' }, { id: 'p2' }] }), /2 of 2 original/);
  assert.match(sourcePresence(source, {}), /absence does not confirm resolution or recovery/);
  assert.deepEqual(source, before);
});
