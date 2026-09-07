export const sections = ['jobs', 'debtors', 'payments', 'labour'];
export const columns = {
  jobs: ['id', 'name', 'revenue', 'materials', 'subcontractors', 'labour', 'other'],
  debtors: ['id', 'customer', 'dueDate', 'outstanding'],
  payments: ['id', 'supplierId', 'supplier', 'invoice', 'amount'],
  labour: ['id', 'jobId', 'person', 'claimedHours', 'approvedHours', 'rate'],
};
const cashFields = new Set(['revenue', 'materials', 'subcontractors', 'labour', 'other', 'outstanding', 'amount', 'rate']);
function invoiceReference(value) {
  const reference = value.toUpperCase().replace(/[\s\-/#.]/g, '');
  if (!/[\p{L}\p{N}]/u.test(reference)) throw new Error('Invoice reference must contain letters or numbers.');
  return reference;
}
export function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use dates in YYYY-MM-DD format.');
  const stamp = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date.');
  return stamp;
}
export function money(value) {
  const str = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(str)) throw new Error('Amounts must be non-negative numbers with at most two decimal places.');
  const [whole, fraction = ''] = str.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 1_000_000_000_00) throw new Error('Amount exceeds the supported limit.');
  return cents;
}
export function validateRows(section, rows) {
  if (!sections.includes(section) || !Array.isArray(rows) || rows.length > 10000) throw new Error('Unsupported section or more than 10,000 rows.');
  const ids = new Set();
  return rows.map((row, index) => {
    const result = {};
    for (const key of columns[section]) {
      const value = row?.[key];
      if (value === undefined || value === null || String(value).trim() === '') throw new Error(`Row ${index + 1}: ${key} is required.`);
      if (cashFields.has(key)) result[key] = money(value);
      else if (key.endsWith('Hours')) {
        if (!/^\d+(\.\d{1,2})?$/.test(String(value)) || Number(value) > 100000) throw new Error(`Row ${index + 1}: invalid hours.`);
        result[key] = Number(value);
      } else {
        result[key] = String(value).trim();
        if (result[key].length > 200) throw new Error(`Row ${index + 1}: ${key} is too long.`);
      }
    }
    if (section === 'debtors') dateValue(result.dueDate);
    if (section === 'payments') invoiceReference(result.invoice);
    if (ids.has(result.id)) throw new Error(`Row ${index + 1}: duplicate record ID.`);
    ids.add(result.id);
    return result;
  });
}
export function analyse(input, asOf, targetMargin = 25) {
  const today = dateValue(asOf);
  if (!Number.isFinite(targetMargin) || targetMargin < 0 || targetMargin > 100) throw new Error('Target margin must be between 0 and 100.');
  const data = Object.fromEntries(sections.map(s => [s, validateRows(s, input[s] ?? [])]));
  const jobs = data.jobs.map(j => {
    const cost = j.materials + j.subcontractors + j.labour + j.other;
    const profit = j.revenue - cost;
    return { ...j, cost, profit, margin: j.revenue ? profit / j.revenue * 100 : null, shortfall: Math.max(0, Math.round(j.revenue * targetMargin / 100) - profit) };
  });
  const debtors = data.debtors.map(d => {
    const days = Math.max(0, Math.floor((today - dateValue(d.dueDate)) / 86400000));
    return { ...d, days, bucket: days === 0 ? 'Current' : days <= 30 ? '1–30' : days <= 60 ? '31–60' : days <= 90 ? '61–90' : '90+', risk: d.outstanding === 0 ? 'Settled' : days > 60 ? 'High' : days > 30 ? 'Review' : days > 0 ? 'Overdue' : 'Current' };
  });
  const groups = new Map();
  for (const p of data.payments) {
    const invoice = invoiceReference(p.invoice);
    const key = JSON.stringify([p.supplierId, invoice, p.amount]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const duplicates = [...groups.values()].filter(g => g.length > 1 && g[0].amount > 0).map(g => ({ id: g.map(p => p.id).sort().join(':'), supplier: g[0].supplier, invoice: g[0].invoice, count: g.length, amount: g[0].amount * (g.length - 1), paymentIds: g.map(p => p.id) }));
  const labour = data.labour.map(l => {
    const hundredths = Math.round(l.claimedHours * 100) - Math.round(l.approvedHours * 100);
    const product = hundredths * l.rate;
    if (!Number.isSafeInteger(product)) throw new Error('Labour value exceeds safe calculation limits.');
    return { ...l, varianceHours: hundredths / 100, exposure: Math.max(0, Math.round(product / 100)) };
  });
  const sum = (rows, field) => rows.reduce((total, r) => {
    const next = total + r[field];
    if (!Number.isSafeInteger(next)) throw new Error('Dataset total exceeds safe calculation limits.');
    return next;
  }, 0);
  const overdue = debtors.filter(d => d.days > 0 && d.outstanding > 0);
  const revenue = sum(jobs, 'revenue');
  const profit = sum(jobs, 'profit');
  return { jobs, debtors, duplicates, labour, revenue, profit, margin: revenue ? profit / revenue * 100 : null,
    overdue: sum(overdue, 'outstanding'), duplicateExposure: sum(duplicates, 'amount'),
    investigation: sum(overdue, 'outstanding') + sum(duplicates, 'amount'),
    jobShortfall: sum(jobs, 'shortfall'), labourExposure: sum(labour, 'exposure'),
    coverage: Object.fromEntries(sections.map(s => [s, data[s].length])) };
}
export const controls = [
  'Bank accounts reconciled through the last month end',
  'Supplier invoices checked for duplicates before payment',
  'Supplier bank detail changes independently verified',
  'Overdue debtors reviewed and followed up weekly',
  'Job costs compared with estimates every week',
  'Labour hours approved before payroll or payment',
  'Variations approved and billed promptly',
  'Retention balances and release dates reviewed',
  'Payment approval separated from payment preparation',
  'Access to financial systems reviewed regularly',
];
export function controlHealth(answers) {
  const answered = controls.filter((_, i) => ['yes', 'no'].includes(answers[i])).length;
  const passed = controls.filter((_, i) => answers[i] === 'yes').length;
  return { answered, passed, total: controls.length, score: answered ? Math.round(passed / answered * 100) : null };
}
