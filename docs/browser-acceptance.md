# Repeatable synthetic browser acceptance

The locally runnable, CI-required `npm run test:browser:synthetic` check launches a fresh, temporary headless Chrome/Edge/Chromium profile and the actual connected workspace, retention review and dashboard React components in a local Vite fixture. It exercises the real in-memory workspace coordinator, navigation guard, recovery forms and CSV worker. Authentication, the Supabase port and Next Link are **synthetic adapters**. No account, customer records, real credentials, paid service, production endpoint or networked financial database is involved.

## Run

Install the two locked dependency sets (`npm ci` and `npm ci --prefix frontend`). Have Chrome, Chromium or Edge installed locally. Then run `npm run test:browser:synthetic`; on an unusual installation path set `CHROME_BIN` to the exact browser executable. The script uses Node's built-in WebSocket and Chrome DevTools Protocol; it does not install Playwright or launch an authenticated personal browser profile. A temporary Vite service binds to 127.0.0.1:8792 and the browser debugger binds to a temporary 127.0.0.1 port.

On GitHub's Linux runner the `verify` workflow attempts this check after locked dependency installation. Browser availability is a test requirement: an unavailable executable must fail explicitly rather than silently producing a green result.

## Acceptance cases

1. An editor saves an explicit synthetic recovery; one server-adapter call occurs and the local entry is cleared.
2. A viewer cannot see action-edit or recovery-submission controls.
3. A revision conflict displays recovery review and requires loading/acknowledging the latest record, without automatically replaying the write.
4. An uncertain write does the same without automatically replaying it.
5. Unsaved recovery entries trigger the cancellation path on business navigation; the loaded actions remain visible.
6. Next/previous pagination shows the expected synthetic action IDs at offsets 100 and 0.
7. Invalid negative recovery fails before the synthetic port receives a write.
8. A simulated remote sign-out clears the action view and returns to the sign-in state.

The runner also covers these cases (28 total as of 24 October 2026; ordering follows the executable script):

- Viewer audit history: before/after fields, actor attribution, baseline and older/latest navigation without writes.
- Retention import confirmations; date states/totals/currency lock; invalid replacement and clearing; 51-record pagination; full JSON export and replacement page reset; missing-date feedback and restoration (six cases).
- Dashboard job mapping/preview cancellation; source-date validation and applied context/version; custom mapping and currency rejection; payment reporting periods; debtor snapshot and exported reporting metadata (five cases).
- Session action closure evidence, filtered exports and reopening; recovery correction before/after history; source removal with original context preserved; complete session cleanup and unload-guard release (four cases).
- Needs-details completion, due-today versus overdue boundaries and dismissal removing an action from unfinished queues (one case).
- Unchanged recovery saves do not duplicate revisions; unsaved drafts survive filters, remain excluded from exports and can be discarded (one case).
- Duplicate CSV headers and invalid negative amounts reject replacements without changing loaded reporting context or preventing retry (one case).
- Loaded records and pending imports reject currency changes; clearing the session permits a new explicit currency reflected in export (one case).

Canonical `d662e66dd0e57848b2622929af0adf66567ce2ae` passed all 24 cases locally and its GitHub verify workflow completed successfully. JSON export assertions inspect generated Blob contents in memory; they do not verify the operating system's file-save behavior. Source data is generated in memory from fictional records.

The fixture fails on uncaught browser runtime exceptions. Each browser invocation uses a fresh temporary profile, synthetic account, isolated local fixture and no real user data. Do not substitute this mock acceptance suite for independent security evidence.

A complementary, optional Puppeteer-based `npm run test:browser:pilot` runner remains available for its 11 checks (including synthetic beforeunload probe), but it requires a separate local Puppeteer installation and is not the required CI gate. See [optional browser fixture instructions](../integration/browser-fixture/README.md).

## Open release gates

These checks do **not** verify the actual deployed Next route or a live Supabase project, true multiconnection RLS/locking, real Auth token expiry, native refresh/close confirmation UI, production hosting, cross-browser compatibility or customer-data security. The mock intentionally bypasses credential handling and the real Supabase transport. Complete `docs/live-supabase-checks.md` with a disposable synthetic project, then undertake interactive browser checks against the full application using synthetic accounts before enabling the customer pilot.
