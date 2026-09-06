import test from 'node:test';
import assert from 'node:assert/strict';
import { analyse, money, dateValue, controlHealth, validateRows } from '../core/engine.mjs';
import { demo, demoDate } from '../core/demo.mjs';
const run = data => analyse(data, demoDate);
test('demo totals reconcile to source records without adding overlapping cost signals', () => {
  const r = run(demo);
  assert.equal(r.revenue, 7810000);
  // 4,450 + 5,400 + 5,800 + 2,150 = 17,800.
  assert.equal(r.profit, 1780000);
  assert.equal(r.overdue, 1020000);
  assert.equal(r.duplicateExposure, 125000);
  assert.equal(r.investigation, 1145000);
  assert.equal(r.labourExposure, 160000);
});
test('three matching payments count only two extra payments', () => {
  const payments = [...demo.payments.slice(0, 2), { ...demo.payments[0], id: 'P4' }];
  assert.equal(run({ payments }).duplicateExposure, 250000);
});
test('supplier identity and amount prevent false matches', () => {
  const payments = [demo.payments[0], { ...demo.payments[1], supplierId: 'other' }, { ...demo.payments[0], id: 'P4', amount: 1200 }];
  assert.equal(run({ payments }).duplicates.length, 0);
});
test('payment ordering does not change duplicate exposure', () => {
  assert.equal(run({ payments: demo.payments.toReversed() }).duplicateExposure, run(demo).duplicateExposure);
});
test('zero revenue produces unknown margin while retaining actual losses', () => {
  const r = run({ jobs: [{ ...demo.jobs[0], revenue: 0 }] });
  assert.equal(r.margin, null);
  assert.equal(r.jobs[0].margin, null);
  assert.equal(r.jobs[0].profit, -1955000);
});
test('weighted margin is not the average of individual margins', () => {
  const r = run(demo);
  assert.equal(r.margin, r.profit / r.revenue * 100);
});
test('due dates, future invoices and settled debtors never inflate overdue exposure', () => {
  const debtors = ['2026-09-06', '2026-09-07', '2026-01-01'].map((dueDate, i) => ({ id: String(i), customer: 'Fictional', dueDate, outstanding: i === 2 ? 0 : 100 }));
  assert.equal(run({ debtors }).overdue, 0);
});
test('ageing bucket boundaries are deterministic UTC calendar days', () => {
  for (const [days, bucket] of [[0, 'Current'], [1, '1–30'], [30, '1–30'], [31, '31–60'], [60, '31–60'], [61, '61–90'], [90, '61–90'], [91, '90+']]) {
    const dueDate = new Date(dateValue(demoDate) - days * 86400000).toISOString().slice(0, 10);
    assert.equal(run({ debtors: [{ id: '1', customer: 'Fictional', dueDate, outstanding: 10 }] }).debtors[0].bucket, bucket);
  }
});
test('invalid dates and numeric coercions fail closed', () => {
  for (const v of ['2026-02-30', '06/09/2026', '', 'invalid']) assert.throws(() => dateValue(v));
  for (const v of ['', '-1', '1e4', 'NaN', '1.234', '1,000', Infinity]) assert.throws(() => money(v));
  assert.equal(money('0.29'), 29);
  assert.equal(money('100.01'), 10001);
});
test('duplicate source IDs are rejected rather than double counted', () => assert.throws(() => run({ payments: [demo.payments[0], demo.payments[0]] }), /duplicate record/));
test('missing data is unassessed and input is not mutated', () => {
  assert.deepEqual(run({}).coverage, { jobs: 0, debtors: 0, payments: 0, labour: 0 });
  const before = JSON.stringify(demo); run(demo); assert.equal(JSON.stringify(demo), before);
  assert.equal(controlHealth({}).score, null);
  assert.deepEqual(controlHealth({ 0: 'yes', 1: 'no', 2: 'unknown' }), { answered: 2, passed: 1, total: 10, score: 50 });
});
test('negative labour variance does not net off positive exceptions', () => {
  const labour = [demo.labour[0], { ...demo.labour[1], claimedHours: 10 }];
  assert.equal(run({ labour }).labourExposure, 104000);
});
test('row limits and required fields are enforced', () => {
  assert.throws(() => validateRows('jobs', Array(10001).fill({})), /10,000/);
  assert.throws(() => run({ jobs: [{ id: 'x' }] }), /required/);
  assert.throws(() => analyse({}, demoDate, NaN));
});
test('fractional hours round only after valuing integer hundredths', () => {
  const r = run({ labour: [{ ...demo.labour[0], claimedHours: '0.30', approvedHours: '0.10', rate: '10.05' }] });
  assert.equal(r.labour[0].varianceHours, 0.2);
  assert.equal(r.labourExposure, 201);
});
test('unsafe labour multiplication fails instead of silently losing precision', () => {
  assert.throws(() => run({ labour: [{ ...demo.labour[0], claimedHours: 100000, approvedHours: 0, rate: 1000000000 }] }), /safe calculation/);
});
