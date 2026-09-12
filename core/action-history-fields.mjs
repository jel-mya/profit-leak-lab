const fields = [
  ['title', 'Action'], ['owner_label', 'Owner'], ['due_date', 'Due date'],
  ['status', 'Status'], ['note', 'Evidence / outcome'],
  ['recovery_amount', 'Reported recovery (minor units)'],
  ['recovery_currency', 'Recovery currency'], ['recovery_date', 'Recovery date'],
  ['recovery_evidence', 'Recovery evidence'],
];
function display(value) {
  return value === null || value === undefined || value === '' ? 'Not set' : String(value);
}
export function actionHistoryFields(before, after) {
  return fields.filter(([key]) => !before || (before[key] ?? null) !== (after[key] ?? null))
    .map(([key, label]) => ({ key, label, before: before ? display(before[key]) : null, after: display(after[key]) }));
}
