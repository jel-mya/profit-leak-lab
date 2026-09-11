
export function recoveryDraftCurrency(action, reviewCurrency) {
  return action?.recovery?.currency ?? action?.source?.currency ?? reviewCurrency;
}

export function recoveryDraftForAction(action, reviewCurrency) {
  const recovery = action?.recovery;
  return Object.freeze({
    amount: recovery ? (recovery.amountMinorUnits / 100).toFixed(2) : '',
    date: recovery?.date ?? '',
    evidence: recovery?.evidence ?? '',
    currency: recoveryDraftCurrency(action, reviewCurrency),
  });
}

const field = value => typeof value === 'string' ? value : '';

export function recoveryDraftChanged(action, draft, reviewCurrency) {
  if (!draft) return false;
  const saved = recoveryDraftForAction(action, reviewCurrency);
  return field(draft.amount) !== saved.amount
    || field(draft.date) !== saved.date
    || field(draft.evidence) !== saved.evidence
    || field(draft.currency) !== saved.currency;
}

export function hasRecoveryDraftChanges(actions, drafts, reviewCurrency) {
  const byId = new Map((actions ?? []).map(action => [action.id, action]));
  return Object.entries(drafts ?? {}).some(([id, draft]) => {
    const action = byId.get(id);
    return action ? recoveryDraftChanged(action, draft, reviewCurrency) : false;
  });
}

export function updateRecoveryDraft(drafts, action, reviewCurrency, patch) {
  if (!action?.id) throw new Error('Action id is required.');
  const current = drafts?.[action.id] ?? recoveryDraftForAction(action, reviewCurrency);
  return Object.freeze({
    ...(drafts ?? {}),
    [action.id]: Object.freeze({
      amount: field(patch?.amount ?? current.amount),
      date: field(patch?.date ?? current.date),
      evidence: field(patch?.evidence ?? current.evidence),
      currency: field(patch?.currency ?? current.currency),
    }),
  });
}

export function clearRecoveryDraft(drafts, actionId) {
  const next = { ...(drafts ?? {}) };
  delete next[actionId];
  return Object.freeze(next);
}

export function pruneRecoveryDrafts(actions, drafts) {
  const ids = new Set((actions ?? []).map(action => action.id));
  return Object.freeze(Object.fromEntries(
    Object.entries(drafts ?? {}).filter(([id]) => ids.has(id))
  ));
}

export function recoveryDraftSummary(actions, drafts, reviewCurrency) {
  const byId = new Map((actions ?? []).map(action => [action.id, action]));
  const dirtyActionIds = [];
  for (const [id, draft] of Object.entries(drafts ?? {})) {
    const action = byId.get(id);
    if (action && recoveryDraftChanged(action, draft, reviewCurrency)) dirtyActionIds.push(id);
  }
  return Object.freeze({
    count: dirtyActionIds.length,
    actionIds: Object.freeze(dirtyActionIds),
    hasChanges: dirtyActionIds.length > 0,
  });
}
