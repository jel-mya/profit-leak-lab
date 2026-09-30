import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRetentionCsv, reviewRetentions, validateRetentionRows, retentionHeaders } from '../core/retentions.mjs';

const row = (id, held, released, releaseDueDate) => ({
  id, jobId: 'J-001', counterparty: 'Fictional builder', held, released, releaseDueDate,
});
const csv = (lines, withCurrency = false) =>
  retentionHeaders.join(',') + (withCurrency ? ',currency' : '') + '\n' +
  lines.map(line => retentionHeaders.map(k => line[k]).join(',') + (withCurrency ? ',' + line.currency : '')).join('\n') + '\n';

test('review amounts separate past date, due today, future and fully released', () => {
  const source = [
    row('R1', '100.00', '25.00', '2026-09-29'),
    row('R2', '70.00', '0.00', '2026-09-30'),
    row('R3', '50.00', '50.00', '2026-09-01'),
    row('R4', '100.00', '0.00', '2026-10-01'),
  ];
  const original = JSON.stringify(source);
  const r = reviewRetentions(source, '2026-09-30');
  assert.deepEqual([r.held, r.released, r.open, r.reviewAmount, r.pastDateAmount, r.flaggedCount],
    [32000, 7500, 24500, 14500, 7500, 2]);
  assert.deepEqual(r.items.map(i => i.state),
    ['Past listed date', 'Date reached today', 'Fully released', 'Upcoming']);
  assert.equal(JSON.stringify(source), original);
});
test('listed date is not considered passed until the following calendar day', () => {
  const r = reviewRetentions([row('R1', '1.00', '0.00', '2026-09-30')], '2026-09-30');
  assert.equal(r.pastDateAmount, 0);
  assert.equal(r.reviewAmount, 100);
});
test('CSV without currency requires an explicit single-currency confirmation', () => {
  const text = csv([row('R1', '10.00', '2.00', '2026-09-20')]);
  assert.throws(() => parseRetentionCsv(text, 'AUD', false), /Confirm/);
  assert.equal(reviewRetentions(parseRetentionCsv(text, 'AUD', true), '2026-09-30').reviewAmount, 800);
});
test('CSV currency column checks every row and rejects empty or mixed codes', () => {
  const records = [{ ...row('R1', '10.00', '2.00', '2026-09-20'), currency: 'AUD' },
    { ...row('R2', '2.00', '0.00', '2026-09-20'), currency: 'USD' }];
  assert.throws(() => parseRetentionCsv(csv(records, true), 'AUD', false), /mixed/);
  records[1].currency = '';
  assert.throws(() => parseRetentionCsv(csv(records, true), 'AUD', false), /mixed/);
  records[1].currency = 'aud';
  assert.equal(parseRetentionCsv(csv(records, true), 'AUD', false).length, 2);
});
test('invalid source records fail closed without producing false review amounts', () => {
  assert.throws(() => validateRetentionRows([row('X', '10', '20', '2026-09-20')]), /released exceeds held/);
  assert.throws(() => validateRetentionRows([row('X', '-1', '0', '2026-09-20')]), /non-negative/);
  assert.throws(() => validateRetentionRows([row('X', '10.999', '0', '2026-09-20')]), /two decimal/);
  assert.throws(() => validateRetentionRows([row('X', '10', '0', '2026-02-30')]), /Invalid calendar/);
  assert.throws(() => validateRetentionRows([row('X', '10', '0', '2026-09-20'), row('X', '5', '0', '2026-09-20')]), /duplicate/);
  assert.throws(() => validateRetentionRows(Array(10001).fill(row('X', '1', '0', '2026-09-20'))), /10,000/);
});
test('missing fields, unexpected CSV columns and duplicate headers are rejected', () => {
  assert.throws(() => parseRetentionCsv('id,amount\n1,10\n', 'AUD', true), /Expected columns/);
  assert.throws(() => parseRetentionCsv('id,id\n1,1\n', 'AUD', true), /headers/);
  assert.throws(() => validateRetentionRows([{ ...row('X', '1', '0', '2026-09-20'), jobId: '' }]), /required/);
});
test('empty header-only export is a valid, explicitly empty review', () => {
  assert.equal(reviewRetentions(parseRetentionCsv(retentionHeaders.join(',') + '\n', 'AUD', true), '2026-09-30').count, 0);
});
