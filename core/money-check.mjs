/** Anonymous review-priority heuristic. No monetary estimate or confirmed loss. */
export const moneyCheckQuestions = Object.freeze([
  { id: 'debtors', text: 'Do customers regularly owe you money after the agreed due date?', attentionAnswer: 'yes', highRisk: true, area: 'Overdue customer money', evidence: 'Gather debtor ageing, agreed payment terms and recent receipts. Confirm disputed or already paid balances.', capability: 'Debtor ageing and overdue balances requiring review.', href: '/' },
  { id: 'suppliers', text: 'Have you ever found a supplier invoice or payment that looked duplicated, changed or unfamiliar?', attentionAnswer: 'yes', highRisk: true, area: 'Supplier payments', evidence: 'Compare the supplier payment export with invoices, credits, payment approvals and bank evidence. Investigate changed or unfamiliar items separately.', capability: 'Potential duplicate supplier payments requiring investigation. Changed or unfamiliar payments need a separate manual review.', href: '/' },
  { id: 'margin', text: 'Do jobs sometimes finish with less profit than you expected when you quoted them?', attentionAnswer: 'yes', highRisk: false, area: 'Job margin', evidence: 'Gather job revenue, quoted costs, actual costs and approved variations. Check that each report covers the same jobs and period.', capability: 'Job margin below the selected target.', href: '/' },
  { id: 'labour', text: 'Are wages or labour hours difficult to match back to individual jobs?', attentionAnswer: 'yes', highRisk: false, area: 'Labour costs', evidence: 'Gather job-coded hours, labour budgets and actual labour costs. Resolve missing job codes before comparing totals.', capability: 'Labour variance signals against job budgets.', href: '/' },
  { id: 'retentions', text: 'Do you have retentions held by builders or customers that are hard to track by contract, variation and release date?', attentionAnswer: 'yes', highRisk: true, area: 'Retentions', evidence: 'Gather the retention register, contracts, claims, variation approvals and release conditions. Confirm the basis and dates from source evidence.', capability: 'Retention balances and dates requiring evidence review. Variation-versus-original-contract entitlement is a manual evidence check.', href: '/retentions' },
  { id: 'variations', text: 'Are variations sometimes approved or completed without a clear link to the final claim and job margin?', attentionAnswer: 'yes', highRisk: false, area: 'Variation records', evidence: 'Match variation approvals and completed work to final claims and job-cost reports. Record unresolved differences for follow-up.', capability: 'Use job profitability and action tracking to support your manual review. Automated variation reconciliation is not available.', href: '/' },
  { id: 'payments', text: 'Could a bill be paid twice without someone independently noticing before payment?', attentionAnswer: 'yes', highRisk: true, area: 'Payment controls', evidence: 'Review payment approvals, duplicate checks and who independently confirms the payment batch before it is released.', capability: 'Potential duplicate supplier payments and action tracking. This review does not authorise or block payments.', href: '/' },
  { id: 'explain', text: 'Can you quickly explain the largest amounts currently requiring investigation?', attentionAnswer: 'no', highRisk: false, area: 'Evidence and explanations', evidence: 'List the largest open items, their source records and what remains unexplained. Check for overlapping amounts before adding totals.', capability: 'Source-linked review findings and action tracking.', href: '/' },
  { id: 'routine', text: 'Do you have a repeatable month-end review for debtors, supplier payments, job profitability, labour and retentions?', attentionAnswer: 'no', highRisk: false, area: 'Review routine', evidence: 'Define the reports, reporting period, reviewer and recurring review date. Record gaps and follow-up actions.', capability: 'Local review areas for debtors, duplicate supplier payments, job margin, labour and retentions.', href: '/' },
  { id: 'followup', text: 'If a financial issue is found, is there an owner, due date and evidence trail showing what happened next?', attentionAnswer: 'no', highRisk: false, area: 'Follow-up', evidence: 'Check each open issue has an owner, due date, source evidence and a recorded outcome.', capability: 'Action tracking with owners, due dates and evidence history.', href: '/' },
].map(question => Object.freeze(question)));
export const moneyCheckAnswerLabels = Object.freeze({ yes: 'Yes', no: 'No', unsure: 'Not sure' });
export function reviewMoneyCheck(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new TypeError('Answers must be an object.');
  const ids = moneyCheckQuestions.map(question => question.id);
  if (Object.keys(answers).some(id => !ids.includes(id))) throw new TypeError('Unknown question.');
  const responses = moneyCheckQuestions.map(question => {
    const answer = Object.hasOwn(answers, question.id) ? answers[question.id] : undefined;
    if (typeof answer !== 'string' || !Object.hasOwn(moneyCheckAnswerLabels, answer)) throw new TypeError('Answer every question with Yes, No or Not sure.');
    return { ...question, answer, status: answer === 'unsure' ? 'uncertain' : answer === question.attentionAnswer ? 'attention' : 'clear' };
  });
  const attention = responses.filter(response => response.status === 'attention');
  const uncertain = responses.filter(response => response.status === 'uncertain');
  const highRiskCount = attention.filter(response => response.highRisk).length;
  const priority = highRiskCount >= 2 || attention.length >= 5 ? 'priority' : highRiskCount >= 1 || attention.length >= 2 || uncertain.length >= 2 ? 'review' : 'lower';
  const label = { lower: 'Lower immediate review priority', review: 'Review recommended', priority: 'Priority review recommended' }[priority];
  const explanation = priority === 'priority'
    ? 'You reported at least two higher-priority symptoms or five symptoms overall. Start with the evidence for the items below.'
    : priority === 'review'
      ? 'You reported a higher-priority symptom, at least two symptoms, or at least two answers you are not sure about. A structured review would help clarify them.'
      : 'You reported few symptoms. Confirm any remaining uncertainty; this result does not establish that your financial controls are effective.';
  return { priority, label, explanation, responses, attention, uncertain, nextChecks: responses.filter(response => response.status !== 'clear') };
}
