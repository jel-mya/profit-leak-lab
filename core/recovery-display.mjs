export function recoveryDisplay(amount, currency) {
  if (amount === null || amount === undefined) return 'Not recorded';
  if (!['AUD', 'USD', 'GBP', 'CAD', 'NZD'].includes(currency)
    || (typeof amount !== 'number' && (typeof amount !== 'string' || !/^\d+$/.test(amount)))) return 'Unavailable';
  const value = Number(amount);
  if (!Number.isSafeInteger(value) || value < 0 || value > 100000000000) return 'Unavailable';
  return `${currency} ${(value / 100).toFixed(2)}`;
}
