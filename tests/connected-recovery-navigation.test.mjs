import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recoveryDraftIsDirty,
  updateDirtyRecoveryActions,
  hasUnsavedRecovery,
  recoveryDiscardWarning,
  canLeaveRecoveryView,
  clearDirtyRecoveryAfterAcknowledgedNavigation,
} from '../core/connected-recovery-navigation.mjs';

test('blank and whitespace-only recovery forms are clean', () => {
  assert.equal(recoveryDraftIsDirty({ amount:'', date:'', evidence:'' }), false);
  assert.equal(recoveryDraftIsDirty({ amount:'  ', date:'', evidence:'   ' }), false);
});

test('each recovery field independently marks the form dirty', () => {
  assert.equal(recoveryDraftIsDirty({ amount:'25.00' }), true);
  assert.equal(recoveryDraftIsDirty({ date:'2026-09-12' }), true);
  assert.equal(recoveryDraftIsDirty({ evidence:'Receipt' }), true);
});

test('registry updates are immutable and de-duplicate action ids', () => {
  const original = new Set(['a1']);
  const first = updateDirtyRecoveryActions(original, 'a2', true);
  const second = updateDirtyRecoveryActions(first, 'a2', true);
  assert.deepEqual([...original], ['a1']);
  assert.deepEqual([...second], ['a1', 'a2']);
});

test('successful save or explicit discard removes only the relevant action', () => {
  const next = updateDirtyRecoveryActions(new Set(['a1','a2']), 'a1', false);
  assert.deepEqual([...next], ['a2']);
});

test('unsaved helper follows registry content', () => {
  assert.equal(hasUnsavedRecovery(new Set()), false);
  assert.equal(hasUnsavedRecovery(new Set(['a1'])), true);
});

test('warning copy supports singular and plural', () => {
  assert.match(recoveryDiscardWarning(1), /an unsaved recovery entry/);
  assert.match(recoveryDiscardWarning(3), /3 unsaved recovery entries/);
});

test('clean navigation never asks for confirmation', () => {
  let calls = 0;
  const allowed = canLeaveRecoveryView(new Set(), () => { calls += 1; return false; });
  assert.equal(allowed, true);
  assert.equal(calls, 0);
});

test('dirty navigation can be cancelled without clearing state', () => {
  const dirty = new Set(['a1']);
  const allowed = canLeaveRecoveryView(dirty, () => false);
  assert.equal(allowed, false);
  assert.deepEqual([...dirty], ['a1']);
});

test('dirty navigation can be explicitly acknowledged', () => {
  assert.equal(canLeaveRecoveryView(new Set(['a1','a2']), () => true), true);
});

test('registry clear is a separate post-confirmation operation', () => {
  assert.equal(clearDirtyRecoveryAfterAcknowledgedNavigation().size, 0);
});

test('invalid registry and action identifiers fail closed', () => {
  assert.throws(() => updateDirtyRecoveryActions([], 'a1', true), /Set/);
  assert.throws(() => updateDirtyRecoveryActions(new Set(), '', true), /Action id/);
});
