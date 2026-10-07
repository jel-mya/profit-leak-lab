# Free Trade Money Check — acquisition contract

Status: growth asset only. This document does not enable customer-data storage, billing, accounting writes or production deployment.

## Purpose

Give an Australian trade-business owner a useful, low-friction first review that explains where money may require investigation without promising that any amount is recoverable.

The check should lead with symptoms rather than accounting terminology. It is a qualification and education asset for ProfitLeakLab, not financial, tax or legal advice.

## Public promise

**Headline:** Where is the money leaking from your trade business?

**Subheading:** Run a free Trade Money Check to see which areas deserve a closer look: overdue customer money, supplier-payment anomalies, labour overruns, job-margin pressure, retentions and basic financial controls.

**Primary CTA:** Start the free check

**Trust line:** No bank connection. No accounting write-back. Do not upload customer records to the public check.

## Symptom-led questions

Use simple Yes / No / Not sure answers. “Not sure” is deliberately useful: uncertainty can identify a control gap without being scored as a proven financial loss.

1. Do customers regularly owe you money after the agreed due date?
2. Have you ever found a supplier invoice or payment that looked duplicated, changed or unfamiliar?
3. Do jobs sometimes finish with less profit than you expected when you quoted them?
4. Are wages or labour hours difficult to match back to individual jobs?
5. Do you have retentions held by builders or customers that are hard to track by contract, variation and release date?
6. Are variations sometimes approved or completed without a clear link to the final claim and job margin?
7. Could a bill be paid twice without someone independently noticing before payment?
8. Can you quickly explain the largest amounts currently requiring investigation?
9. Do you have a repeatable month-end review for debtors, supplier payments, job profitability, labour and retentions?
10. If a financial issue is found, is there an owner, due date and evidence trail showing what happened next?

## Result model

Do not manufacture a dollar saving from questionnaire answers.

Return one of three review priorities:

- **Lower immediate review priority:** few symptoms reported, but “Not sure” answers still identify checks worth confirming.
- **Review recommended:** multiple symptoms or control uncertainties indicate that a structured review would be useful.
- **Priority review recommended:** several high-risk symptoms are present, especially overdue debtors, unexplained supplier payments, untracked retentions or weak payment controls.

Always show the contributing answers. Never describe a questionnaire result as fraud, theft, an accounting error, a tax error or recoverable money.

## Result sections

Each result should contain:

1. **What stood out** — the user's selected symptoms in plain English.
2. **What to check next** — practical evidence to gather, such as debtor ageing, supplier payment export, job-cost report, labour report, retention register and variation records.
3. **What ProfitLeakLab can test** — map only to implemented review areas.
4. **What this does not prove** — anomalies require investigation; totals can overlap; retention entitlement depends on source evidence.
5. **Next step** — allow the user to open the local review/demo or contact MYA separately. Do not require an account to receive the questionnaire result.

## Product mapping

| Symptom | Existing ProfitLeakLab area | Safe wording |
| --- | --- | --- |
| Overdue customer money | Debtor ageing/risk | “Overdue balance requiring review” |
| Supplier payment concern | Duplicate supplier payments | “Potential extra payment requiring investigation” |
| Margin pressure | Job profitability | “Job margin below the selected target” |
| Labour overrun | Labour variance | “Labour variance signal” |
| Retention uncertainty | Retention date review | “Retention balance/date requiring evidence review” |
| Weak follow-up | Action tracking / control checklist | “Control or follow-up gap” |

Variation-versus-original-contract retention and unusual-payment detection must not be advertised as available until their isolated branches are independently verified and merged to canonical main.

## Data boundary

The public questionnaire should be stateless by default. It needs no names, ABNs, invoice numbers, customer names, supplier names, bank details, accounting credentials or uploaded files.

If analytics are added later, they require a separate privacy/operational decision before collection. Do not silently persist questionnaire answers.

The existing import tools remain local-browser review tools. The connected workspace remains disabled for real customer data until the documented live Supabase and operational/privacy release gates pass.

## Conversion events for a future approved implementation

Useful aggregate events, only after privacy approval:

- check_started
- question_completed
- result_viewed
- local_review_opened
- contact_cta_selected

Do not include questionnaire answers, financial values, business names or identifiers in event payloads.

## Acceptance criteria

A future implementation is acceptable only when:

- the result is useful without providing contact details;
- no questionnaire answer is converted into a fabricated dollar amount;
- “Not sure” is supported and explained;
- implemented product capabilities are distinguished from planned ones;
- no customer financial data is requested by the public questionnaire;
- wording avoids guarantees of savings, recovery, fraud detection or compliance;
- public pages do not expose or index connected customer-workspace content;
- repository tests, lint, build, hygiene and relevant HTTP checks pass before merge.

## Release boundary

This growth asset does not change the outstanding release gates: disposable live Supabase Auth/PostgREST/RLS verification, true multi-connection/concurrency verification, native-route and real close/refresh browser verification, and customer-data operational/privacy review.

## Implemented branch build

The `/money-check` route now provides the anonymous ten-question check, all-answer explanations, evidence suggestions and links to local review tools. Answers live only in React page memory: no storage, network submissions, analytics, identity fields or file inputs. Editing an answer clears the old result; Start again clears all answers. The existing no-index policy remains in place. This is a branch build, not a production release.

The transparent product heuristic uses the question polarity above. Questions 1, 2, 5 and 7 are higher-priority symptoms when answered Yes. Two higher-priority symptoms or five total symptoms produce Priority review recommended. One higher-priority symptom, two total symptoms or two Not sure answers produce Review recommended. Otherwise the result is Lower immediate review priority. These thresholds prioritise investigation; they are not a validated financial risk score. Not sure never counts as a confirmed symptom. All ten answers remain available in the result.

Variation reconciliation, changed/unfamiliar supplier payments and retention entitlement remain manual evidence checks. This build does not advertise the unmerged unusual-payment branch as available.

### Validation for this increment

All 221 repository tests, frontend lint/type checks, build, repository hygiene, emitted CSV worker smoke and eight existing synthetic browser scenarios passed. The built app also passed loopback production HTTP checks for `/`, `/workspace`, `/retentions` and `/money-check` with fresh script nonces and the connected workspace disabled.

Chrome screen captures and coordinate click scripts on the local production build verified: incomplete submission focuses the first unanswered radio; all Not sure answers produce Review recommended with zero reported symptoms; protective answers produce the qualified lower priority; two higher-priority symptoms produce priority review; all ten answer explanations remain visible on demand; editing clears the old result; restart and refresh clear answers; native arrow-key radio selection works; the local demo link and return link work; and desktop/390px mobile views have no horizontal overflow. No questionnaire POST requests, local/session storage writes or application runtime exceptions were observed. These targeted checks do not close the broader live-service, concurrency or cross-browser release gates.
