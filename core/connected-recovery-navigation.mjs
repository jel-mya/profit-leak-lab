export function recoveryDraftIsDirty({ amount = '', date = '', evidence = '' } = {}) {
  return Boolean(
    String(amount).trim() ||
    String(date).trim() ||
    String(evidence).trim()
  );
}

export function updateDirtyRecoveryActions(current, actionId, dirty) {
  if (!(current instanceof Set)) throw new Error('Dirty recovery registry must be a Set.');
  if (typeof actionId !== 'string' || !actionId) throw new Error('Action id is required.');

  const next = new Set(current);
  if (dirty) next.add(actionId);
  else next.delete(actionId);
  return next;
}

export function hasUnsavedRecovery(current) {
  return current instanceof Set && current.size > 0;
}

export function recoveryDiscardWarning(count) {
  const safeCount = Number.isSafeInteger(count) && count > 0 ? count : 1;
  return safeCount === 1
    ? 'You have an unsaved recovery entry. Leaving this view will discard it.'
    : `You have ${safeCount} unsaved recovery entries. Leaving this view will discard them.`;
}

export function canLeaveRecoveryView(current, confirmLeave) {
  if (!hasUnsavedRecovery(current)) return true;
  if (typeof confirmLeave !== 'function') {
    throw new Error('A confirmation function is required when recovery drafts are dirty.');
  }
  return Boolean(confirmLeave(recoveryDiscardWarning(current.size)));
}

export function clearDirtyRecoveryAfterAcknowledgedNavigation() {
  return new Set();
}
