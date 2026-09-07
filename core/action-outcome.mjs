export function requireActionOutcome(status, note) {
  if (!['Open', 'Investigating', 'Resolved', 'Dismissed'].includes(status)) throw new Error('Choose a valid action status.');
  if (['Resolved', 'Dismissed'].includes(status) && (typeof note !== 'string' || !note.trim())) throw new Error('Add an evidence / outcome note before resolving or dismissing. Reopen the action before removing its outcome.');
}
