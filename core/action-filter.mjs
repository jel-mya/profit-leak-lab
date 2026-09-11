import { dateValue } from './engine.mjs';
export function filterActions(actions, view, asOf) {
  if (!['All actions', 'Unfinished', 'Closed', 'Overdue'].includes(view)) throw new Error('Unknown action view.');
  const reviewDate = dateValue(asOf);
  return actions.filter(action => {
    const unfinished = ['Open', 'Investigating'].includes(action.status);
    if (view === 'All actions') return true;
    if (view === 'Unfinished') return unfinished;
    if (view === 'Closed') return ['Resolved', 'Dismissed'].includes(action.status);
    if (!unfinished || !action.due) return false;
    try { return dateValue(action.due) < reviewDate; } catch { return false; }
  });
}
