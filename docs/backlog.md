# Delivery ledger

## Implemented in this increment
- Canonical strategy and operational rules recovered from earlier planning.
- Seven control areas with a working review dashboard, fictional demo and CSV templates/imports.
- Auditable investigation cash subtotal; separate overlapping job/labour signals.
- Action owner, due date, status, evidence note and JSON download; explicitly session-only.
- Tenant/RLS SQL foundation, unit tests and CI.

## Highest-value next work
1. Persist actions safely: local SQL isolation, revision-checked updates, client-immutable history and starter-business onboarding now pass tests. Add Supabase Auth and UI onboarding/conflict handling. Repeat isolation/concurrency cases through the actual Supabase API before collecting real customer data.
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

## PostgreSQL isolation increment — 7 September 2026

- Verified GitHub `main` contains the first increment `b0b6b48b924ef2e2701b80c86947426c567bb388`; the earlier pending push completed.
- Added an ephemeral PostgreSQL test harness that loads every migration and tests 13 tenant-access scenarios with actual non-superuser roles and row-level policies.
- `npm test`: 37 tests passed (23 earlier tests, 13 database subtests and their parent test). PGlite is development-only and its package audit reported zero known vulnerabilities.
- CI now installs both locked dependency sets and runs the database suite with the existing checks.
- No production connection, customer-data persistence or UI changes in this increment. Live Supabase Auth/PostgREST verification remains outstanding; the published preview is unchanged.

## Action history and revision checks — 7 September 2026

- Added a populated-database migration for revision counters, baseline events and atomic before/after action history.
- Added an explicitly authorised update RPC that serializes action and membership changes, rejects stale revisions with `PT409`, and prevents direct client updates from bypassing the check.
- Tightened insert privileges so clients cannot forge identity, timestamps or starting revisions. History reads remain tenant-scoped; clients have no history-write privileges.
- All 46 local tests pass: 23 original tests, 22 database subtests and their parent. Tests include stale-save rollback, history immutability, populated-schema migration and spoofed insertion fields.
- No live migration or UI change. Real Supabase Auth/PostgREST and multi-connection locking tests remain release gates.
- Remote verification succeeded after the temporary approval-review usage limit reset; no concurrent branch changes were present.

## Starter-business onboarding — 7 September 2026

- Added an authenticated-only RPC creating a starter business and caller owner membership atomically, without accepting user IDs, tenant IDs or roles from the client.
- Added a private per-identity mapping and transaction lock. Matching retries reuse the existing business; changed retries return conflict. Replays cannot restore revoked ownership or join another business by name.
- All 52 local tests pass, including six onboarding scenarios. No dependencies, frontend or deployed database changed.
- Documented the future UI contract and live Auth, abuse-prevention and multi-connection verification gates in `docs/onboarding.md`.
