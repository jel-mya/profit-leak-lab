import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewUnusualPayments } from '../core/unusual-payments.mjs';
import { analyse } from '../core/engine.mjs';

const payment = (id, amount, fields = {}) => ({
  id, supplierId: 'S1', supplier: 'Fictional Trade Supplier',
  invoice: 'INV-204', amount, ...fields,
});

test('empty input and a single payment produce no unusual-payment finding', () => {
  assert.deepEqual(reviewUnusualPayments([]), []);
  assert.deepEqual(reviewUnusualPayments([payment('P1', 100)]), []);
});

test('matching references with different positive amounts retain review evidence in minor units', () => {
  const [finding] = reviewUnusualPayments([
    payment('P2', '100.01'), payment('P1', '0.29', { invoice: 'inv #204' }),
  ]);
  assert.deepEqual(finding, {
    id: 'P1:P2', supplier: 'Fictional Trade Supplier', invoice: 'INV-204',
    reason: 'Same supplier and invoice reference has different positive payment amounts',
    paymentIds: ['P2', 'P1'], amounts: [29, 10001],
  });
});

test('equal numeric amounts with different decimal representations are not unusual', () => {
  assert.deepEqual(reviewUnusualPayments([
    payment('P1', 100), payment('P2', '100.00'), payment('P3', '100.0'),
  ]), []);
});

test('supplier IDs separate otherwise matching names and invoice references', () => {
  assert.deepEqual(reviewUnusualPayments([
    payment('P1', 100), payment('P2', 200, { supplierId: 'S2' }),
  ]), []);
});

test('supplier display-name differences do not split the same supplier ID', () => {
  const result = reviewUnusualPayments([
    payment('P1', 100), payment('P2', 200, { supplier: 'Fictional Supplier Trading Name' }),
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].paymentIds, ['P1', 'P2']);
});

test('different invoice references do not match merely because amounts differ', () => {
  assert.deepEqual(reviewUnusualPayments([
    payment('P1', 100), payment('P2', 200, { invoice: 'INV-205' }),
  ]), []);
});

test('case, whitespace and supported invoice separators share the duplicate-engine matching rules', () => {
  for (const [first, second] of [
    ['inv-12/3', ' INV #12.3 '], ['é-１２', 'É１２'], ['票-123', '票123'],
  ]) {
    assert.equal(reviewUnusualPayments([
      payment('P1', 100, { invoice: first }), payment('P2', 200, { invoice: second }),
    ]).length, 1);
  }
});

test('unsupported separators are preserved instead of broadening invoice matches', () => {
  assert.deepEqual(reviewUnusualPayments([
    payment('P1', 100, { invoice: 'INV_204' }), payment('P2', 200),
  ]), []);
});

test('zero payments cannot create a different-positive-amount finding', () => {
  assert.deepEqual(reviewUnusualPayments([
    payment('P1', 0), payment('P2', 100), payment('P3', '100.00'),
  ]), []);
  assert.deepEqual(reviewUnusualPayments([payment('P1', 0), payment('P2', 0)]), []);
});

test('zero rows remain source evidence while distinct amount evidence excludes zero and repeats', () => {
  const [finding] = reviewUnusualPayments([
    payment('P1', 0), payment('P2', 300), payment('P3', 20), payment('P4', 300),
  ]);
  assert.deepEqual(finding.paymentIds, ['P1', 'P2', 'P3', 'P4']);
  assert.deepEqual(finding.amounts, [2000, 30000]);
});

test('row ordering preserves finding identity, amount evidence and source membership', () => {
  const rows = [payment('P3', 300), payment('P1', 100), payment('P2', 200)];
  const [forward] = reviewUnusualPayments(rows);
  const [reverse] = reviewUnusualPayments(rows.toReversed());
  assert.equal(forward.id, reverse.id);
  assert.deepEqual(forward.amounts, reverse.amounts);
  assert.deepEqual([...forward.paymentIds].sort(), [...reverse.paymentIds].sort());
});

test('multiple supplier/invoice groups retain only their own source payments', () => {
  const result = reviewUnusualPayments([
    payment('A1', 100), payment('B1', 200, { supplierId: 'S2' }),
    payment('A2', 150), payment('B2', 250, { supplierId: 'S2' }),
    payment('C1', 500, { invoice: 'INV-205' }),
  ]);
  assert.deepEqual(result.map(item => item.paymentIds), [['A1', 'A2'], ['B1', 'B2']]);
});

test('unusual signals stay separate from exact-duplicate and headline investigation totals', () => {
  const rows = [payment('P1', 100), payment('P2', 100), payment('P3', 200)];
  const before = analyse({ payments: rows }, '2026-10-02');
  assert.equal(reviewUnusualPayments(rows).length, 1);
  assert.equal(before.duplicateExposure, 10000);
  assert.equal(before.investigation, 10000);
  assert.deepEqual(analyse({ payments: rows }, '2026-10-02'), before);
  assert.equal(analyse({ payments: [payment('P1', 100), payment('P2', 200)] },
    '2026-10-02').investigation, 0);
});

test('frozen input records are accepted without mutation', () => {
  const rows = Object.freeze([Object.freeze(payment('P1', 100)), Object.freeze(payment('P2', 200))]);
  const before = JSON.stringify(rows);
  assert.equal(reviewUnusualPayments(rows).length, 1);
  assert.equal(JSON.stringify(rows), before);
});

test('invalid amounts, missing identifiers and punctuation-only invoices fail closed', () => {
  for (const amount of [-1, '1.234', '1e2', '1,000', Infinity, '1000000000.01']) {
    assert.throws(() => reviewUnusualPayments([payment('P1', amount)]), /Amounts|limit/);
  }
  for (const fields of [{ id: '' }, { supplierId: '' }, { invoice: '' }]) {
    assert.throws(() => reviewUnusualPayments([payment('P1', 100, fields)]), /required/);
  }
  for (const invoice of ['***', '???', '- / # .', '💰']) {
    assert.throws(() => reviewUnusualPayments([payment('P1', 100, { invoice })]), /letters or numbers/);
  }
});

test('duplicate source IDs are rejected before grouping', () => {
  assert.throws(() => reviewUnusualPayments([payment('P1', 100), payment('P1', 200)]),
    /duplicate record ID/);
});

test('the shared import record limit is enforced at both boundaries', () => {
  const rows = Array.from({ length: 10000 }, (_, index) => payment(`P${index}`, index % 2 + 1));
  const [finding] = reviewUnusualPayments(rows);
  assert.equal(finding.paymentIds.length, 10000);
  assert.deepEqual(finding.amounts, [100, 200]);
  assert.throws(() => reviewUnusualPayments([...rows, payment('P10000', 1)]), /10,000/);
  assert.throws(() => reviewUnusualPayments(null), /Unsupported section/);
});
