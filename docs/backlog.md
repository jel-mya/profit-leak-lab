# Delivery ledger

## Implemented in this increment
- Canonical strategy and operational rules recovered from earlier planning.
- Seven control areas with a working review dashboard, fictional demo and CSV templates/imports.
- Auditable investigation cash subtotal; separate overlapping job/labour signals.
- Action owner, due date, status, evidence note and JSON download; explicitly session-only.
- Tenant/RLS SQL foundation, unit tests and CI.

## Highest-value next work
1. Persist actions safely: local SQL isolation, revision-checked updates, client-immutable history and starter-business onboarding now pass tests. Opt-in Supabase Auth and UI onboarding/conflict handling are implemented and disabled by default. Repeat isolation/concurrency cases through the actual Supabase API before collecting real customer data.
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
- The first release permitted inline hydration scripts; the later opt-in workspace increment replaced this with per-request nonces. No raw HTML rendering is used.

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

## Authenticated workspace state and adapter — 7 September 2026

- Added a Supabase client adapter and in-memory workspace coordinator for verified identity, explicit tenant selection, bounded action reads and revision-checked saves.
- Session/tenant changes invalidate late responses; access loss clears cached financial state. Conflict drafts survive until explicit reload and reconciliation; no automatic write retry occurs.
- All 65 local tests pass, including 13 client lifecycle/adapter tests. No runtime dependency, deployed database or preview UI changed.
- The new modules are not yet wired into the screens. Follow `docs/workspace-client.md` for SDK sign-in/sign-out integration, pagination, conflict UI and live verification requirements.

## Opt-in workspace UI — 7 September 2026

- Added verified account sign-in, explicit business selection, starter business creation, action creation/editing, pagination and manual conflict reconciliation at /workspace.
- Sessions stay in memory; server configuration defaults off and accepts only a public Supabase project URL and modern publishable key.
- Worker HTML uses per-request script nonces and restricts connections to the configured Supabase project.
- Live Auth/PostgREST and customer-data operational checks remain outstanding; no real project was connected.

- Validation: 72 tests pass, application lint/type checks and production build pass. Local production HTTP checks verified both screens, unique CSP nonces on all 21 script tags per response, no-store headers and disabled configuration endpoint.

## Workspace access-loss hardening — 7 September 2026

- Expired/denied reads and onboarding now clear identity, memberships and records consistently with saves. Foreign-tenant write responses also invalidate cached access.
- Recoverable page-load network errors return to business selection with records and paging cleared. Late access errors cannot erase a newer authorised selection.
- 76 automated tests pass, including regressions for all affected paths. Live Supabase verification remains outstanding; the cloud workspace stays disabled.
- The previously delivered charcoal/orange trade palette is preserved.

## Review before applying imports — 7 September 2026

- CSV selection now stages validated records in browser memory. The preview shows the first five rows, total count, current currency/date and explicit replacement consequences.
- Users must apply or cancel; header-only files explicitly warn that the section will be cleared. Changing record type, clearing the session or restoring the demo invalidates pending file reads.
- Apply revalidates against current review settings and constructs replacement data without mutating the live dataset. No file content is uploaded or persisted.
- 79 tests pass, including replacement isolation, demo clearing, empty-file semantics and invalid-preview rollback. Browser interaction testing is not claimed.
- Column mapping, period metadata, worker parsing and main-table pagination remain unfinished.

## Bounded review tables — 7 September 2026

- Main financial review tables display 50 rows per page with first/previous/next/last controls, record range and total count. Financial totals continue to use all records.
- Applying an import, clearing a session or restoring demo data resets pages. Smaller result sets clamp stale page requests safely.
- 82 tests pass, including traversing all 10,000 supported records exactly once, final-page bounds, empty results and invalid paging input.
- This bounds rendered table rows, not analysis/parsing CPU or all React element construction. Worker parsing and column mapping remain next import priorities. Browser interaction testing is not claimed.

## Explicit CSV column mapping — 7 September 2026

- Added a column-match step before preview for all four import types. Exact canonical names are preselected; other names require explicit choices. No vendor-specific schema or semantic guessing is claimed.
- Mappings require every target exactly once and distinct existing source columns. Extra source columns are excluded from resulting records, with an excluded-column count before validation.
- Existing amount/date/ID validation remains intact. Input inspection rejects duplicate/empty headers, more than 100 columns, more than 10,000 records and malformed row widths, including unused columns.
- Raw text remains only in browser memory until mapping, cancellation or replacement; it is not uploaded or saved. Mapped previews retain the separate apply/cancel step.
- 86 tests pass, including mapping ambiguity, unused-field exclusion, invalid values and inspection bounds. Browser interaction testing remains unperformed.

## Read-only action history viewer — 7 September 2026

- Connected pilot actions now expose change history for owners, editors and viewers. Events show recorded account/time and before/after editable values; baselines are distinguished from actual edits.
- Reads filter business and action and page 50 events at a time using descending revision cursors. Session/tenant changes and writes invalidate cached history and late responses.
- 91 tests pass, including viewer reads, unloaded-action rejection, foreign-tenant response rejection, late sign-out/switch/save responses and bounded adapter query construction.
- The viewer remains behind the existing disabled-by-default cloud configuration gate. No Supabase project was connected or database migration applied; live integration remains a release gate.

## Executable live-read verification preparation — 7 September 2026

- Added opt-in `npm run test:live:reads` using the installed official Supabase SDK, verified synthetic users and positive fixtures for two tenants plus a viewer.
- Verifies membership/role scope, own-record visibility, known foreign-ID filtering and anonymous read denial. Makes no financial writes; temporary Auth sessions are signed out with bounded requests.
- Added local tests demonstrating detection of leaked rows, missing positive fixtures, role drift, duplicate identities and broken endpoints. All 96 tests pass.
- Verified the CLI refuses to run without explicit synthetic-project configuration (nonzero exit, no network request). No real Supabase execution occurred. See `docs/live-supabase-checks.md` for setup and remaining write/concurrency gates.
- No frontend change or preview deployment is required for this verification tooling increment.

## Source-linked session actions — 7 September 2026

- Tracking a job, debtor, payment group or labour record now records stable section/record identities plus original currency, as-of date, target margin, review amount and session import version. JSON downloads retain this context.
- Repeated tracking uses the source identity rather than display-title matching. Payment groups are order-independent; delimited IDs cannot collide.
- Actions link back to the source section. Source reimports and relevant settings changes are labelled for review again without changing action status, original amounts or totals.
- 100 tests pass, including source identity stability, immutable captured context, reimport/settings flags and invalid financial context.
- These references are session-only and do not store raw source rows or make recovery claims. Same-ID reimports are conservatively flagged even if values match. Persistent finding versions, evidence-backed closure and reconciliation remain unfinished; no automatic resolution is inferred from missing records.

## Outcome required for action closure — 8 September 2026

- Session actions and connected-workspace drafts now require a nonblank evidence/outcome note before resolving or dismissing. Reopening permits further investigation; closure does not alter investigation totals or claim recovery.
- Added a database CHECK constraint for new inserts/updates. It is NOT VALID so legacy closed rows remain untouched; editing those rows requires an outcome or reopening. No history or explanatory evidence is fabricated during migration.
- 104 tests pass, including blank closure rejection before client writes, SQL rollback without revision/history changes, valid closure history and legacy migration preservation.
- Live migration execution remains outstanding. Notes record the user's explanation; their presence does not verify the explanation or prove a financial recovery.

## Retry-safe action creation database contract — 8 September 2026

- Added an authenticated creation RPC with per-caller request UUIDs, transaction locking, membership rechecks and private original-payload mapping. Matching retries return the existing action without another event; changed requests conflict.
- Replays preserve later action edits and deny revoked/viewer/foreign access. Private mappings have no client grants and retain referential history.
- 110 tests pass, including six new database scenarios. Actual simultaneous-connection and Supabase API behaviour remain unverified.
- The existing client still uses direct inserts. Next: integrate request-key retention and explicit uncertain-result handling; the migration alone does not change the current UI's retry behaviour. See `docs/action-creation.md`.
- No frontend change, live migration or preview deployment in this increment.

## Creation retry client integration — 8 September 2026

- The workspace adapter now creates through the idempotent RPC. Uncertain responses retain the original draft and request key; identical retries reuse it, while different drafts require explicit review/abandonment.
- Added pending-request controls to retry original values, reload saved actions or deliberately discard after checking. A confirmed creation clears its draft before refreshing the list; failed reads report that the write succeeded.
- 114 tests pass, including key reuse, payload-change blocking, explicit abandonment, validation failure cleanup, sign-out clearing and exact RPC payload forwarding.
- Pending requests remain memory-only and are lost across sign-out/reload/business switching. Live Supabase migrations/API/concurrency and browser flows remain unverified; cloud configuration stays disabled.

## Live write/concurrency verification preparation — 8 September 2026

- Added separately opted-in synthetic write mode after mandatory read-isolation checks. It checks matching creation requests, payload conflict, denied updates, competing same-revision updates and exact history consistency.
- The mode intentionally leaves a synthetic action/history and never deletes audit records. Missing write opt-in fails before network activity. Runtime secrets and returned records are not printed.
- All 116 local tests pass, including injected failure detection for duplicate actions, permission leaks, double winners and broken history/replay results. Verified CLI refusal without write opt-in; no live Supabase execution occurred.
- No frontend change in this tooling increment. Preview source transfer for the earlier client change remains awaiting the user's explicit approval after automatic approval review rejected it; do not retry that transfer without the response.
