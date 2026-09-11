# Delivery ledger

## First canonical increment (historical)
- Canonical strategy and operational rules recovered from earlier planning.
- Seven control areas with a working review dashboard, fictional demo and CSV templates/imports.
- Auditable investigation cash subtotal; separate overlapping job/labour signals.
- Action owner, due date, status, evidence note and JSON download; explicitly session-only.
- Tenant/RLS SQL foundation, unit tests and CI.

## Highest-value next work
1. Persist actions safely: local SQL isolation, revision-checked updates, client-immutable history and starter-business onboarding now pass tests. Opt-in Supabase Auth and UI onboarding/conflict handling are implemented and disabled by default. Repeat isolation/concurrency cases through the actual Supabase API before collecting real customer data.
2. Import reporting context: preview, explicit column mapping, optional currency-column checks, cancellable worker parsing and table pagination are implemented. Next capture source reporting dates explicitly and carry them through preview, applied data and action downloads. Do not infer periods from debtor due dates or filenames. Distinguish debtor snapshots, transaction periods and cumulative job costs; explain mismatches without silently filtering records. Verify cancellation/replacement cannot attach old metadata to new records.
3. Source-linked exception lifecycle: session source IDs, original review context, reimport/settings warnings and required closure notes are implemented. Next retain import-version metadata and reconcile findings across imports without auto-closing them. Recovered money remains separate, requiring an explicit amount, currency, date and evidence; never infer recovery from disappearance or closure.
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

## Preserve imported review currency — 8 September 2026

- Currency changes are blocked while imported records are loaded, preventing relabelling unchanged amounts as another currency. Empty sessions and fictional demos can still choose supported currencies.
- Pending file reads, mappings and previews also retain their currency context; cancel the import before switching. The UI explains the clear-session workflow without silently discarding data.
- 119 tests pass, covering loaded imports, pending previews and supported empty-session choices. This does not detect mixed currencies inside an export; users must still supply a consistent currency/tax basis.
- Preview publication remains awaiting explicit source-transfer approval; this increment is delivered to canonical GitHub only.

## Cancellable CSV worker — 8 September 2026

- CSV file reading/inspection and mapped-record parsing now run in a module worker. The UI can terminate pending work when cancelling, replacing a task, changing import type, clearing the session or unmounting.
- Cancelled promises are rejected and late responses ignored; success/error also terminates the worker. Existing size/row/value validation is reused. No server upload or browser storage was added.
- 123 tests pass, including worker-task bounds, cancellation/replacement and error cleanup. Production build emitted the worker; a Node worker shim executed that actual bundle successfully for inspection, mapping and errors. CI now runs this smoke check after building.
- This is not browser interaction verification. Final apply/review calculations and transfer/copy overhead remain on the main thread; no complete performance guarantee is claimed.
- Canonical GitHub delivery only while preview transfer approval remains pending.

## Validate optional export currency columns — 8 September 2026

- Mapping now offers an optional currency-code column. Every mapped row must match the selected review currency; mixed, blank or non-code values fail before preview. Case and surrounding whitespace are normalised, but amounts are never converted.
- The preview states whether currency codes were checked. Choosing no currency column explicitly leaves the single-currency assertion with the user; the app does not infer currency from symbols, amounts or filenames.
- 125 tests pass, including mismatched rows, missing currency columns, metadata exclusion and worker forwarding. The emitted-worker smoke also checks rejection of mismatched currency.
- Canonical GitHub delivery only; preview transfer approval remains pending.

## Usable supplier invoice references — 8 September 2026

- Payment imports now reject invoice references containing no letters or numbers before preview or calculation. Masked references such as `***` can no longer create misleading duplicate-payment flags.
- Existing case/separator matching and international letters/digits remain supported; supplier identity and amount remain part of every match.
- 128 automated tests passed, including import rejection and matching regressions. Live Supabase verification remains outstanding. Preview publishing remains pending the previously requested source-transfer approval.

## Enforce CSV limits during parsing — 8 September 2026

- The parser now stops when a row exceeds 100 columns or the file exceeds 10,000 nonblank records, rather than constructing the entire parsed dataset before checking those limits. The existing 2 MB byte ceiling remains.
- Exactly-at-limit files, blank lines and quoted multiline fields retain their intended behaviour. Oversized blank rows are also rejected by the column bound.
- 130 automated tests pass, including boundary acceptance and early rejection before a malformed trailing record. This is a bounded allocation safeguard, not a browser performance benchmark.
- Preview transfer approval remains pending; delivery is to canonical GitHub only.

## Consistent whitespace-only outcome rejection — 8 September 2026

- Reproduced a database/client mismatch: some Unicode whitespace-only notes passed PostgreSQL's locale-dependent whitespace check while the client rejected them.
- Added a transactional migration using the explicit ECMAScript trim character set. New closed-action writes require content under the same rule; existing notes and history are not rewritten. The constraint remains NOT VALID for legacy compatibility.
- 131 tests pass, including each supported whitespace character, mixed whitespace and preservation of a real note surrounded by whitespace. The regression failed before the migration and passed afterward.
- No live Supabase migration was applied. Customer persistence remains disabled pending live verification; no preview source transfer was attempted.

## Malformed workspace response handling — 8 September 2026

- Empty successful API responses and malformed action/history lists now fail with INVALID_RESPONSE and clear cached workspace access, matching the existing foreign-tenant response handling. Null save, creation and conflict reload responses can no longer fall through as generic TypeErrors.
- Added adapter-level checks before list slicing, plus controller checks before record access. This does not replace server RLS or claim complete response schema validation.
- 134 local tests pass, including malformed lists, empty writes and adapter null responses. Live Supabase verification remains outstanding and configuration remains disabled.
- Preview source transfer remains awaiting the earlier approval; canonical GitHub delivery only.

## Reject invalid CSV encodings — 8 September 2026

- File inspection now decodes UTF-8 strictly instead of silently replacing invalid bytes. This prevents damaged supplier/invoice identifiers from being accepted as changed text; users are prompted to export CSV UTF-8.
- UTF-8 BOMs and valid international characters remain supported. No automatic legacy-encoding conversion or identifier repair occurs.
- 136 tests pass, including invalid leading bytes, malformed/truncated sequences, encoded surrogates and Unicode identifier preservation. The emitted-worker smoke now also exercises invalid encoding rejection.
- Canonical GitHub delivery only while preview source-transfer approval remains pending. No live Supabase changes.

## Live creation-permission verification preparation — 8 September 2026

- Extended the opt-in live write harness to require permission-denied responses when foreign-business users, viewers and anonymous callers invoke action creation. Previously it checked unauthorised updates only.
- Added injected tests proving each role's creation leak fails verification independently. A misconfigured disposable project may retain unexpected synthetic records when a denial check fails; no cleanup deletes audit evidence.
- 137 local tests pass. No live credentials were used, no live API checks ran and no migrations were applied. Actual Supabase verification remains the customer-persistence release gate.

## Exact positive read fixtures — 8 September 2026

- Live read verification now requires the exact requested action ID and history action ID as well as the expected business. An unrelated record in the correct tenant can no longer count as positive fixture evidence.
- 138 local tests pass, including wrong-record responses for both owners and the viewer. Existing empty-fixture, foreign-record and unavailable-table checks remain covered.
- No live API calls or migrations were made. Customer persistence remains disabled until actual Supabase verification; preview unchanged.

## Tenant action-page index — 8 September 2026

- Replaced the business-only action index with `(business_id, id)` to match the adapter's tenant filter and ordered pagination. The leading business column still supports existing tenant-only lookups.
- The migration changes no records, grants or row-level policies. Apply through the migration process before enabling a live workspace; normal index creation can hold write locks, so schedule appropriately for an existing populated service.
- 138 local tests pass with all migrations loaded, including PostgreSQL tenant isolation and action concurrency contracts. No live migration or production performance benchmark was run.

## Complete live audit snapshot comparisons — 8 September 2026

- Live write verification now compares every returned action field against creation/update audit snapshots and creation replays, rather than checking only status, revision and the winning note. Created events must have a null before-state.
- 139 local tests pass, including altered before-state identity, after-state business, creation notes and replay identity that previously escaped the narrower checks.
- These are injected verifier tests, not live Supabase execution. No credentials, customer data, live migrations or preview transfers were used.

## Current release constraints and next-run focus — 8 September 2026

- Live Supabase verification is prepared but has not run. Local PostgreSQL and injected API tests do not satisfy this gate. Cloud configuration remains disabled.
- Canonical GitHub delivery is working. Sites preview source transfer remains blocked by the earlier automatic approval review pending the user's response; do not retry without approval. The preview does not contain all canonical increments.
- While these external gates remain unavailable, prioritise reporting context and exception lifecycle above. Add defensive fixes for concrete defects rather than repeatedly extending completed verification scaffolding.
- This documentation-only increment reconciles the roadmap with delivered code. No new runtime verification is claimed.

## Import reporting dates and version ledger — 11 September 2026

- Import preview now requires an explicit balances-at date for debtors, cumulative-through date for jobs, or start/end period for payments and labour. No dates are inferred from records or filenames; mismatches with the review date warn without filtering or modifying amounts.
- Applied reporting dates are shown in Import and retained in a session-only version ledger included in action JSON downloads. Source-linked actions already carry section/version identifiers, allowing lookup of their original reporting context. Clear-session/demo resets remove the ledger.
- Preview date fields are stored on the preview itself: replacement/cancellation removes them with the preview, and new previews start blank. Invalid or reversed dates fail before replacing live records.
- 141 local tests pass, including calendar validation and distinct snapshot/cumulative/period semantics. Browser interaction tests and live Supabase verification remain unrun. Preview publication still awaits the earlier source-transfer approval.

## Original reporting context on actions — 11 September 2026

- Source-linked action cards now show their original snapshot, cumulative-through or reporting-period dates and import version. Lookup matches section, version and currency, so later imports cannot replace the displayed historical context.
- Missing context, including fictional demo actions, is explicitly labelled as not recorded. No dates are guessed and no action status or recovery amount changes.
- 142 local tests pass, including reimport stability, cross-section/version/currency separation and missing metadata. No browser interaction or live Supabase verification was performed; preview transfer approval remains pending.

## Source record presence after reimport — 11 September 2026

- Tracked action cards now compare original source IDs against the currently loaded section and report absent-record counts. IDs in other sections do not satisfy the match.
- Presence does not assert unchanged values or exception conditions. Absence prompts review of export coverage/ID changes and never resolves an action or implies recovery. Original source evidence remains unchanged.
- 143 local tests pass, covering full/partial/absent source sets, cross-section isolation and immutable tracking context. Browser interaction and live Supabase checks remain unrun; preview transfer approval remains pending.

## Combined reporting import preparation — 11 September 2026

- Moved record and reporting-metadata validation into one shared preparation function used by Apply. It returns replacement data and its matching ledger entry only after both validate; unsupported currency and unsafe version numbers are rejected.
- 144 local tests pass, including invalid-date/amount rollback, detached replacement records and matching metadata/version/count. This tests the preparation boundary, not browser scheduling or interaction.
- Previous source-presence CI completed successfully. Live Supabase verification and preview source-transfer approval remain outstanding.

## Self-describing action downloads — 11 September 2026

- Added a named versioned download format, export timestamp, demo/private mode, current target margin and explicit amount-unit/interpretation notes. Existing actions, currency, review date and import history remain present.
- Documented legacy files, original versus current review settings and the device timestamp's limits in `docs/action-download.md`. No raw import rows are added and no restore capability is implied.
- Application lint and production build passed. This additive export-label change does not alter financial calculations; no new unit tests were added.

## Reuse source indexes across action cards — 11 September 2026

- Source-presence checks now share per-section ID indexes memoised by the loaded dataset. Editing action notes or rendering multiple cards no longer rebuilds a full source-row set for every action.
- 145 local tests pass, retaining missing/present semantics and verifying indexes detach from source objects and rebuild for changed records. This reduces repeated algorithmic work; no browser timing or performance benchmark is claimed.
- The preceding download-format CI passed. Preview source-transfer approval and actual Supabase verification remain outstanding.

## Current exception identity reconciliation — 11 September 2026

- Tracked action cards now indicate whether their exact source identity still triggers a current job-margin, overdue-debtor, labour or duplicate-payment exception. Current finding keys are calculated once per analysis.
- Duplicate groups require the same complete payment-ID set; changed groups are not silently treated as the original finding. No match explicitly warns about changed records/grouping/settings and never establishes resolution or recovery.
- 146 local tests pass, covering inactive conditions, overdue boundaries and exact duplicate-group identity. Browser interaction and live Supabase checks remain unrun; preview source-transfer approval remains pending.

## Separate user-reported recovery records — 11 September 2026

- Session action cards now have an optional recovery form requiring an explicit amount, calendar date and evidence. Currency is retained from the existing recovery/source or current review for manual actions. Nothing is prefilled as a recovery amount.
- Recovery records are labelled user-reported, included in action downloads and excluded from investigation calculations. Saving does not close an action. Entries are editable by replacement within the session; zero plus an explanation can correct a mistaken claim. This is not immutable recovery audit history or independent verification.
- 147 local tests pass, including money precision, date/currency/evidence validation and zero correction. No live persistence or browser interaction verification; preview approval remains pending.

## Recovery correction history — 11 September 2026

- Session recovery edits now retain detached before/after snapshots, sequential revision numbers and device timestamps in action downloads. Unchanged saves do not add revisions; corrections to zero retain the earlier claim and its evidence.
- Cards show saved revision counts and explicitly describe session-only retention. This is not server-enforced immutable history, verified evidence or cross-session persistence.
- 148 local tests pass, including corrections, unchanged-save behaviour and protection against later object mutation. Prior recovery-feature CI passed. Live Supabase and preview transfer gates remain outstanding.

## Recovery history viewer — 12 September 2026

- Recovery forms now include a collapsible viewer of the latest five saved revisions, newest first, with before/after amounts, currency, recovery dates, evidence and device timestamps. Downloads still contain every revision.
- The viewer reads saved snapshots, not unsaved form drafts, and reverses only a copied slice so display ordering cannot mutate audit entries. It does not verify claims or change action/financial state.
- Recovery tests, application lint and production build passed. No browser interaction verification was performed. Previous recovery-history CI succeeded; preview transfer approval remains pending.
