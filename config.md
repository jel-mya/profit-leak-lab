# ProfitLeakLab — canonical strategy and operating rules

Canonical codebase: https://github.com/jel-mya/profit-leak-lab

## Strategy recovered from ProfitLeakLab Day Build

ProfitLeakLab is the platform; Trade Financial Control is its first product. Help busy trade and construction businesses find financial exceptions and take corrective action alongside Xero, QuickBooks, MYOB or spreadsheets. Do not replace accounting, represent flags as fraud, or promise recoveries.

Initial audiences: owners, growing 2–10 person trades, 10–50 person contractors, office managers and bookkeepers. Start with plumbing, electrical, HVAC and builders; expand only after demand. International direction: US, Australia, UK, Canada and New Zealand, with explicit currencies and separately researched country packs. No implicit exchange conversion or tax advice.

Product path: free Trade Money Check → Excel Trade Financial Control edition → SaaS preview → authenticated SaaS → explicitly authorised multi-client bookkeeper accounts. The Excel edition remains a prototype and potential financing product. Prior conversations describe workbook and V0.1–V0.3 packages, but their source artifacts were not present in the canonical repository at initial checkout; do not claim they were imported or verified.

First SaaS capabilities: job profitability, debtor ageing/risk, duplicate supplier payments, labour variance, financial-control health, action tracking and an auditable money-requiring-investigation dashboard. Future controls include retention, unusual payments and material/subcontractor leakage. Import only necessary structured fields, never whole accounting databases by default.

Organic acquisition: symptom-led calculators, useful articles and trade/country pages. Prioritise queries such as contractor profit margin calculator, busy but not profitable, duplicate supplier payment checker, debtor ageing, labour cost variance and bookkeeping health check. Expand using actual Search Console evidence; avoid thin duplicated country pages. Repurpose useful material for social/video/email, but sending messages requires explicit authorisation.

Historical pricing hypotheses, not active offers: Excel Core US$59, Pro US$99, Professional US$179–249, country packs US$19–29. Validate willingness to pay before configuring billing. Payhip is the planned download commerce layer; Stripe the subscription payment path. Earlier statements that accounts are connected are not verified runtime integrations.

## Capital and authority

Original capital ceiling: A$500, intended to be recovered with a return. Current instruction takes precedence: spend A$0 without explicit payment approval. Historic gates: domain up to A$40 after checks; paid infrastructure only after A$200 gross revenue; paid acquisition only after 10 independent paying customers, max A$100 experiment with A$50 stop checkpoint and target 130% attributable gross return. These are planning gates, not permission to spend. Recheck current vendor terms/prices before a decision.

Autonomously choose the highest-value unfinished task, implement, test, document, commit and push useful increments. Ask only for payment, KYC/identity, legal acceptance, protected credentials or irreversible financial actions. Never commit secrets, tokens, customer records or raw imports. Never force-push or overwrite others' work. Inspect the remote and working tree before each increment.

## Calculation contract

Money is integer minor units in the engine. Each analysis has one explicit currency and ISO as-of date. Gross profit = revenue minus materials, subcontractors, labour and other costs. Margin is null at zero revenue. Debtors age from contractual due date; future/current items are not overdue. Duplicate flags compare supplier identity, normalised invoice reference and amount, and count only extra payments. Labour variance compares claimed and approved hours at the supplied rate.

Investigation totals are signals, not proven loss, collectible cash, savings, audit opinions or credit scores. Keep job/labour cost signals separate from cash exceptions to avoid presenting overlapping amounts as additive. Missing data is unknown, never healthy. Financial-control health is an explicitly answered checklist score, not assurance.

## Architecture and delivery

Cloudflare-compatible frontend; stateless browser analysis first. Supabase Auth/Postgres and tenant-scoped row-level security for future persistence. No service-role credential in any frontend. Explicit business membership controls every tenant access; deny anonymous database reads. Real financial data must not enter demo storage, logs, analytics, fixtures or Git.

See README.md, docs/architecture.md and docs/backlog.md for verified implementation state and next work. Earlier market figures/vendor fees are historical research, not current verified facts. No revenue or recovered-money claim without evidence.
