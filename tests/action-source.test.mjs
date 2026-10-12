import test from 'node:test';
import assert from 'node:assert/strict';
import { actionSource, findingKeys, sourceReviewStatus } from '../core/action-source.mjs';
import { reviewUnusualPayments } from '../core/unusual-payments.mjs';
import { analyse } from '../core/engine.mjs';
const make = (section = 'payments', ids = ['P2', 'P1']) => actionSource(section, ids, 125000, 'AUD', '2026-09-07', 25, 1);
test('unquantified payment findings keep a distinct, stable action identity and export marker', () => {
  const source = actionSource('payments', ['P2', 'P1'], 0, 'AUD', '2026-09-07', 25, 1, 'unusual-payment');
  const reordered = actionSource('payments', ['P1', 'P2'], 0, 'AUD', '2026-09-07', 25, 1, 'unusual-payment');
  assert.equal(source.key, reordered.key);
  assert.notEqual(source.key, make().key);
  assert.equal(source.amountMinorUnits, 0);
  assert.equal(JSON.parse(JSON.stringify(source)).findingKind, 'unusual-payment');
  assert.deepEqual(source.recordIds, ['P1', 'P2']);
  assert.match(sourceReviewStatus(source, { payments: 2 }, 'AUD', '2026-09-07', 25), /reimported/);
  for (const [section, amount, kind] of [
    ['jobs', 0, 'unusual-payment'], ['payments', 100, 'unusual-payment'], ['payments', 0, 'unknown'],
  ]) assert.throws(() => actionSource(section, ['P1'], amount, 'AUD', '2026-09-07', 25, 1, kind), /Invalid unquantified/);
});

test('different-amount actions reconcile current sources independently of exact duplicates', () => {
  const rows = [100, 100, 200].map((amount, index) => ({
    id: `P${index + 1}`, supplierId: 'S1', supplier: 'Fictional Supplier', invoice: 'INV-204', amount,
  }));
  const makeUnusual = ids => actionSource('payments', ids, 0, 'AUD', '2026-09-07', 25, 1, 'unusual-payment');
  const original = makeUnusual(['P1', 'P2', 'P3']);
  const review = data => findingKeys(analyse({ payments: data }, '2026-09-07'), reviewUnusualPayments(data));
  assert.equal(review(rows).has(original.key), true);
  assert.equal(review(rows.toReversed()).has(original.key), true);
  assert.equal(review(rows).has(make('payments', ['P1', 'P2']).key), true);
  assert.equal(review(rows).has(make('payments', ['P1', 'P2', 'P3']).key), false);
  const equalised = rows.map(row => ({ ...row, amount: 100 }));
  assert.equal(review(equalised).has(original.key), false);
  assert.equal(review(equalised).has(make('payments', ['P1', 'P2', 'P3']).key), true);
  assert.equal(review(rows.slice(1)).has(original.key), false);
  assert.equal(review([]).has(original.key), false);
  assert.equal(original.findingKind, 'unusual-payment');
});
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
  const { sourcePresence, sourceIndex } = await import('../core/action-source.mjs');
  const source = actionSource('payments', ['p1', 'p2'], 1000, 'AUD', '2026-09-01', 25, 1);
  const before = structuredClone(source);
  assert.match(sourcePresence(source, sourceIndex({ payments: [{ id: 'p2', amount: 0 }, { id: 'p1', amount: 0 }] })), /All original source IDs/);
  assert.match(sourcePresence(source, sourceIndex({ payments: [{ id: 'p1' }] })), /1 of 2 original/);
  assert.match(sourcePresence(source, sourceIndex({ jobs: [{ id: 'p1' }, { id: 'p2' }] })), /2 of 2 original/);
  assert.match(sourcePresence(source, {}), /absence does not confirm resolution or recovery/);
  assert.deepEqual(source, before);
});

test('source indexes detach from input records and preserve section boundaries', async () => {
  const { sourceIndex } = await import('../core/action-source.mjs');
  const data = { payments: [{ id: 'p1' }] };
  const index = sourceIndex(data);
  data.payments[0].id = 'p2';
  assert.equal(index.payments.has('p1'), true);
  assert.equal(index.payments.has('p2'), false);
  assert.equal(index.jobs.size, 0);
  assert.equal(sourceIndex(data).payments.has('p2'), true);
});

test('current finding identities follow financial conditions without resolving tracked actions', async () => {
  const { findingKeys } = await import('../core/action-source.mjs');
  const keys = findingKeys({ jobs: [{ id: 'j1', shortfall: 0 }], debtors: [{ id: 'd1', days: 1, outstanding: 100 }, { id: 'd2', days: 0, outstanding: 100 }], labour: [{ id: 'l1', exposure: 0 }], duplicates: [{ paymentIds: ['p2', 'p1'] }] });
  const source = (section, ids) => actionSource(section, ids, 100, 'AUD', '2026-09-01', 25, 1);
  assert.equal(keys.has(source('debtors', ['d1']).key), true);
  for (const [section, id] of [['jobs', 'j1'], ['debtors', 'd2'], ['labour', 'l1']]) assert.equal(keys.has(source(section, [id]).key), false);
  assert.equal(keys.has(source('payments', ['p1', 'p2']).key), true);
  assert.equal(keys.has(source('payments', ['p1', 'p2', 'p3']).key), false);
});
