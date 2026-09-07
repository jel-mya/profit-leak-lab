import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewCurrency } from '../core/review-currency.mjs';
test('loaded imports cannot be relabelled as a different currency', () => {
  for (const next of ['USD', 'GBP', 'CAD', 'NZD']) assert.throws(() => reviewCurrency('AUD', next, true, false), /Imported records/);
  assert.equal(reviewCurrency('AUD', 'AUD', true, false), 'AUD');
});
test('pending files and previews cannot silently change currency context', () => {
  assert.throws(() => reviewCurrency('AUD', 'USD', false, true), /Cancel the pending import/);
  assert.equal(reviewCurrency('AUD', 'AUD', false, true), 'AUD');
});
test('empty sessions and demos can choose a supported currency without conversion', () => {
  for (const next of ['AUD', 'USD', 'GBP', 'CAD', 'NZD']) assert.equal(reviewCurrency('AUD', next, false, false), next);
  assert.throws(() => reviewCurrency('AUD', 'EUR', false, false), /supported/);
});
