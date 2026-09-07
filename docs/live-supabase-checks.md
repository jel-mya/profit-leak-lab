# Live Supabase read-isolation checks

Status: the verifier is implemented and tested with injected synthetic responses. It has **not** passed against a real Supabase project. This is one release gate, not certification of production readiness.

## Prepare a disposable project

Use a separate project containing only synthetic test data. Apply all repository migrations in order using approved administrative tooling. Provision three distinct, email-verified, non-anonymous Auth accounts: owner A, owner B and viewer A. Each must have exactly one membership: owner A owns business A, owner B owns business B, and viewer A is a viewer of business A. Create one synthetic action in each business through the normal authenticated insert path, so both have a history event. Do not use customer accounts or records.

Creating an account/project, accepting terms and supplying protected credentials remain user-controlled setup. This command neither provisions fixtures nor applies migrations. It uses a public publishable key, never an administrator/service-role key.

## Runtime settings

Install the existing locked dependencies with `npm ci` and `npm ci --prefix frontend`. Supply these variables to the local process through a protected environment; do not place values in shell command history, Git, screenshots or reports. No environment file is loaded automatically.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_LIVE_TEST_CONFIRM` | Must be exactly `SYNTHETIC_ONLY` |
| `SUPABASE_URL` | Disposable project's exact HTTPS `*.supabase.co` origin |
| `SUPABASE_PUBLISHABLE_KEY` | Modern public publishable key for that project |
| `LIVE_OWNER_A_EMAIL`, `LIVE_OWNER_A_PASSWORD` | First owner test account |
| `LIVE_OWNER_B_EMAIL`, `LIVE_OWNER_B_PASSWORD` | Second owner test account |
| `LIVE_VIEWER_A_EMAIL`, `LIVE_VIEWER_A_PASSWORD` | Viewer test account in business A |
| `LIVE_BUSINESS_A_ID`, `LIVE_ACTION_A_ID` | Synthetic business A and its action UUIDs |
| `LIVE_BUSINESS_B_ID`, `LIVE_ACTION_B_ID` | Synthetic business B and its action UUIDs |

Run `npm run test:live:reads`. Missing/invalid settings exit nonzero and explicitly report that live checks were not run. The tool does not switch on `CLOUD_WORKSPACE_ENABLED` or change the hosted preview.

## What it verifies

- Real SDK email/password authentication and Auth `getUser()` verification for three distinct users.
- Exact expected membership scope and role for each fixture user.
- Positive access to each user's own business, action and history. Missing fixtures cannot masquerade as successful isolation.
- No rows for the other tenant's known business/action/history IDs.
- Anonymous financial-table reads return no rows or the expected privilege denial. Missing-table and other unexpected API errors fail the check.

Only selects are issued to financial tables. Authentication creates temporary sessions; the runner attempts local-scope sign-out for every client, including when checks fail. Sign-out failures produce a nonzero result and a request to revoke those disposable sessions manually. Requests have a 15-second timeout. Output includes fixed check descriptions only; it suppresses SDK errors, credentials, record contents and fixture IDs. Do not enable HTTP/debug logging around the run.

## Remaining gates

This does not verify write permissions, stale-write conflict HTTP mapping, simultaneous update/onboarding locks, revoked access, JWT expiry, anonymous sign-up configuration, private schema exposure, browser behaviour, backups/restores or retention/deletion policies. Keep the connected workspace disabled for customers until those checks and operational requirements are satisfied. Record actual execution date, code commit and pass/fail status without credentials or record data. A unit-test pass is not a live-project pass.
