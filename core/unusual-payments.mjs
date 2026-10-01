import { validateRows } from './engine.mjs';

const normaliseInvoice = value => value.toUpperCase().replace(/[\s\-/#.]/g, '');

export function reviewUnusualPayments(rows) {
  const payments = validateRows('payments', rows);
  const groups = new Map();
  for (const payment of payments) {
    const key = JSON.stringify([payment.supplierId, normaliseInvoice(payment.invoice)]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(payment);
  }
  return [...groups.values()]
    .filter(group => new Set(group.filter(item => item.amount > 0).map(item => item.amount)).size > 1)
    .map(group => ({
      id: group.map(item => item.id).sort().join(':'),
      supplier: group[0].supplier,
      invoice: group[0].invoice,
      reason: 'Same supplier and invoice reference has different positive payment amounts',
      paymentIds: group.map(item => item.id),
      amounts: [...new Set(group.filter(item => item.amount > 0).map(item => item.amount))].sort((a, b) => a - b),
    }));
}
