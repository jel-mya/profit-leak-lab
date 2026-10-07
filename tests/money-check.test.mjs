import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyCheckQuestions, reviewMoneyCheck } from '../core/money-check.mjs';
const clear = () => Object.fromEntries(moneyCheckQuestions.map(q => [q.id, q.attentionAnswer === 'yes' ? 'no' : 'yes']));
test('no reported symptoms yields a qualified lower review priority', () => {
  const result = reviewMoneyCheck(clear());
  assert.equal(result.priority, 'lower');
  assert.equal(result.responses.length, 10);
  assert.equal(result.nextChecks.length, 0);
  assert.match(result.explanation, /does not establish/);
});
test('last three questions reverse the attention polarity', () => {
  const result = reviewMoneyCheck({ ...clear(), explain: 'no', routine: 'no', followup: 'no' });
  assert.equal(result.priority, 'review');
  assert.deepEqual(result.attention.map(r => r.id), ['explain', 'routine', 'followup']);
});
test('higher-priority symptoms escalate one to review and two to priority', () => {
  for (const q of moneyCheckQuestions.filter(q => q.highRisk)) assert.equal(reviewMoneyCheck({ ...clear(), [q.id]: 'yes' }).priority, 'review');
  assert.equal(reviewMoneyCheck({ ...clear(), debtors: 'yes', payments: 'yes' }).priority, 'priority');
});
test('five non-high-risk symptoms also require priority review', () => {
  assert.equal(reviewMoneyCheck({ ...clear(), margin: 'yes', labour: 'yes', variations: 'yes', explain: 'no', routine: 'no' }).priority, 'priority');
});
test('one ordinary symptom stays lower; two recommend review', () => {
  assert.equal(reviewMoneyCheck({ ...clear(), margin: 'yes' }).priority, 'lower');
  assert.equal(reviewMoneyCheck({ ...clear(), margin: 'yes', labour: 'yes' }).priority, 'review');
});
test('uncertainty remains an evidence gap rather than a confirmed symptom', () => {
  const one = reviewMoneyCheck({ ...clear(), debtors: 'unsure' });
  assert.equal(one.priority, 'lower');
  assert.equal(one.attention.length, 0);
  assert.equal(one.nextChecks[0].status, 'uncertain');
  const all = reviewMoneyCheck(Object.fromEntries(moneyCheckQuestions.map(q => [q.id, 'unsure'])));
  assert.equal(all.priority, 'review');
  assert.equal(all.attention.length, 0);
  assert.equal(all.uncertain.length, 10);
  assert.equal(all.nextChecks.length, 10);
});
test('results retain exact contributing answers and do not mutate inputs', () => {
  const answers = Object.freeze({ ...clear(), suppliers: 'yes', labour: 'unsure' });
  const result = reviewMoneyCheck(answers);
  assert.deepEqual(Object.fromEntries(result.responses.map(r => [r.id, r.answer])), answers);
  assert.deepEqual(result.nextChecks.map(r => r.id), ['suppliers', 'labour']);
  assert.ok(!('amount' in result));
});
test('incomplete, unknown, inherited and invalid answers are rejected', () => {
  for (const input of [null, [], 'yes', {}, { ...clear(), extra: 'yes' }, { ...clear(), debtors: 'maybe' }, { ...clear(), debtors: 'toString' }, { ...clear(), debtors: { toString: () => 'yes' } }, { ...clear(), debtors: 1 }, Object.create(clear())]) assert.throws(() => reviewMoneyCheck(input), TypeError);
});
test('supplier and variation guidance does not promise unmerged automation', () => {
  assert.match(moneyCheckQuestions.find(q => q.id === 'suppliers').capability, /separate manual review/);
  assert.match(moneyCheckQuestions.find(q => q.id === 'variations').capability, /Automated variation reconciliation is not available/);
  assert.match(moneyCheckQuestions.find(q => q.id === 'retentions').capability, /manual evidence check/);
});
