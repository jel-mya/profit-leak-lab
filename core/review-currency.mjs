const supported = ['AUD', 'USD', 'GBP', 'CAD', 'NZD'];
export function reviewCurrency(current, next, hasImportedRecords, hasPendingImport) {
  if (!supported.includes(next)) throw new Error('Choose a supported review currency.');
  if (next === current) return current;
  if (hasPendingImport) throw new Error('Cancel the pending import before changing currency, then select the file again.');
  if (hasImportedRecords) throw new Error('Imported records keep their review currency. Download your actions, clear the session, then choose another currency before importing. No currency conversion is performed.');
  return next;
}
