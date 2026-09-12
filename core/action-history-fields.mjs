import { recoveryDisplay } from './recovery-display.mjs';
const fields = [
  ['title', 'Action'], ['owner_label', 'Owner'], ['due_date', 'Due date'],
  ['status', 'Status'], ['note', 'Evidence / outcome'],
  ['recovery_amount', 'Reported recovery'],
  ['recovery_currency', 'Recovery currency'], ['recovery_date', 'Recovery date'],
  ['recovery_evidence', 'Recovery evidence'],
];
function display(value) {
  return value === null || value === undefined || value === '' ? 'Not set' : String(value);
}
export function actionHistoryFields(before, after) {
  const value = (row, key) => key === 'recovery_amount' ? recoveryDisplay(row[key], row.recovery_currency) : display(row[key]);
  return fields.filter(([key]) => !before || (before[key] ?? null) !== (after[key] ?? null)
    || (key === 'recovery_amount' && value(before, key) !== value(after, key)))
    .map(([key, label]) => ({ key, label, before: before ? value(before, key) : null, after: value(after, key) }));
}
