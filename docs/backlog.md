# Delivery ledger

## Implemented in this increment
- Canonical strategy and operational rules recovered from earlier planning.
- Seven control areas with a working review dashboard, fictional demo and CSV templates/imports.
- Auditable investigation cash subtotal; separate overlapping job/labour signals.
- Action owner, due date, status, evidence note and JSON download; explicitly session-only.
- Tenant/RLS SQL foundation, unit tests and CI.

## Highest-value next work
1. Persist actions safely: run the SQL security suite locally, implement Supabase Auth and explicit business onboarding, then action history/concurrency controls. Do not collect real customer data before isolation tests pass.
2. Import ergonomics: preview, mapping common accounting exports, dataset period/currency validation, cancellable worker parsing and large-table pagination. Current exports must follow the supplied templates.
3. Source-linked exception lifecycle: stable findings, dismissals with evidence, separate recovered versus investigated amounts, and import version history.
4. Add retention and unusual-payment controls from the strategy; validate domain calculations with anonymised synthetic fixtures.
5. Free Trade Money Check and original symptom-led acquisition pages; no indexed customer dashboard pages.
6. Billing only after the user handles protected credentials/terms and pricing validation. No spending automatically.

## Evidence discipline
Record actual tests, commits and deployment outcomes below; never label an unrun check passed. The repository started with only a README. Earlier packaged releases have not been recovered as source and are not claimed as implemented here.

## Verification of first canonical increment

- 23 automated engine, CSV and response-security tests passed.
- Application lint/type checks and the Cloudflare production build passed.
- Patched dependency install reported zero known vulnerabilities.
- Production Worker returned HTTP 200 with the expected dashboard, CSP, frame protection and no-store headers.
- Repository hygiene scan passed. No imported customer records or secrets are included.
- Browser interaction/visual QA and live Supabase RLS execution have not been performed. Optional read-only WebMCP summary support is feature-detected; no supported WebMCP validation context was available, so it is not claimed verified.
- CSP currently permits inline scripts for framework hydration; move to nonce-based CSP before authenticated persistence. No raw HTML rendering is used.
