# Architecture and security boundary

The first working increment is a stateless review application, not yet an authenticated production SaaS. React/Vinext renders a Cloudflare-compatible frontend. The pure engine in `core/` operates in the browser; CSV content never enters an API request. On the session review screen, no imports, actions or health answers go into browser storage, telemetry, cookies, logs or the database. The separate opt-in workspace persists action records only when configured; see workspace-client.md. Actions can be explicitly downloaded as JSON. Refreshing loses session state.

The initial date and records are fixed fictional demo fixtures. Importing a first file atomically removes all demo records; later imports replace one section. Failed validation preserves the prior dataset. CSV supports quoted fields, BOM and CRLF. Reject unexpected headers, duplicate IDs, malformed dates, negative amounts, unsafe integers, more than 10,000 rows or more than 2 MB per file. React escapes text. Exported actions use JSON to avoid spreadsheet formula execution.

## Supabase-ready persistence

The migrations in `supabase/migrations/` provide businesses, memberships, actions and action history. All public tables use row-level security. Anonymous access has no table grants; authenticated reads require membership. Editors/owners can create actions and update them through a revision-checked RPC; viewers cannot. Direct membership and business writes remain unavailable to clients; the narrowly scoped onboarding RPC can create one new starter business for the current authenticated identity (see [onboarding contract](onboarding.md)). Column privileges prevent supplying action IDs, authors, timestamps or revisions on insert, and direct client updates are revoked. Membership checks live in a non-exposed private schema with a fixed empty search path and restricted execution privileges.

Do not expose the private schema in the Supabase Data API. Future frontend connections use only a publishable key plus the user's verified Supabase Auth session. A service-role key must never be bundled or sent to the browser. Do not trust client-supplied tenant IDs or JWT user metadata for authorisation. Use RLS even when the application checks membership. No real project or credentials have been configured and the migration must pass live RLS tests before production use.

Reference: [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## Database security tests

`tests/database.test.mjs` executes all checked-in migrations against PostgreSQL through PGlite in memory. It creates minimal `auth.users` and `auth.uid()` test shims, then uses `SET LOCAL ROLE` and synthetic identities to exercise actual database grants, RLS and triggers. Each caller session rolls back; there are no customer records, credentials or on-disk databases.

The scenarios cover anonymous access, owner/editor/viewer permissions, outsiders and missing identities, cross-tenant reads/writes, forged creators, immutable identity/timestamp columns, prohibited client provisioning/deletes, explicit multi-business roles, immediate membership revocation, private helper execution, migration baselines, atomic history, stale revisions and unchanged foreign-tenant data after failed writes. The standard CI test command runs this suite; migrations must continue to satisfy the contract. The harness upgrades a populated foundation schema to exercise backfills as well as new writes.

This verifies the SQL security layer, not Supabase JWT verification, PostgREST schema exposure, project-specific default privileges, session expiry or deployed API behaviour. The identity claim is deliberately supplied by the test harness, never accepted as a trusted user ID by the future application. Repeat these access cases through a disposable Supabase project's actual API before enabling persistent customer data.

## Production gates

Before storing real customer financial data: execute the migration and two-tenant/anonymous/viewer tests against disposable Supabase; implement Auth sign-in/sign-out and session expiry; explicit membership provisioning; protect updates with concurrency control and append-only audit history; verify retention/deletion, backups/restores and privacy terms; restrict redirect origins and review deployed CSP. Accounts/terms/protected credentials require the user's action. Billing and recovery/payment actions are not implemented.

## Action persistence contract

`202609070001_action_history.sql` supplies the database portion of this contract; the opt-in workspace uses its revision RPC, but it has not been applied to a live Supabase project.

- Create an action by inserting only `business_id`, `title`, `owner_label`, `due_date`, `status` and `note`. Omitted optional values use table defaults. Identity, author, timestamps and initial revision come from the database.
- Update using `public.update_control_action(p_action_id, p_expected_revision, p_title, p_owner_label, p_due_date, p_status, p_note)`. Supply the complete editable state and the revision last read; omitted fields are not a partial-update contract. The RPC returns the saved action.
- The RPC explicitly verifies the current user is an owner/editor, locks the action and matching membership, compares revisions and updates atomically. It uses a fixed empty search path. Direct table updates are denied so clients cannot skip this check.
- SQLSTATE `PT409` indicates stale or missing expected revision. The future UI must retain the user's draft, reload the current action and present a conflict for reconciliation, never blindly retry with a newer revision. Unauthorized and missing actions both return `42501` without revealing existence.
- Every accepted save, including unchanged editable values, increments `revision` and appends a transactionally coupled history event. History contains structured action snapshots, not raw import data. Any validation failure rolls back the action and history together.
- Existing rows get explicitly labelled `baseline` events with no invented actor. New changes use the authenticated actor ID. Trusted maintenance without an Auth subject records a null actor. History is immutable to application clients; it is not tamper-proof against database administrators.
- Event reads use current business membership; clients cannot create, update or delete history. Foreign keys intentionally prevent deleting actions/businesses with retained history. A privileged retention/deletion policy must be designed and tested before production rather than relying on cascading deletion.

Local tests demonstrate stale-version rejection, not simultaneous multi-connection load behaviour. Verify locking, HTTP conflict mapping and revoked-session access against the real Supabase API before release.

Never commit exports, credentials, customer records or database backups. Keep demo data fictional. Dependencies are locked; assess audit results instead of applying forced major upgrades. Security headers must be applied to Worker HTML responses as well as static files; Cloudflare `_headers` alone does not protect Worker-generated HTML. [Cloudflare header guidance](https://developers.cloudflare.com/pages/configuration/headers/).

The outcome migration (202609080001) requires nonblank notes on future resolved/dismissed action writes. It deliberately preserves existing rows using a NOT VALID constraint. Review legacy closed records through normal authorised updates, then validate the constraint in an approved database maintenance step; never invent outcomes or rewrite history merely to pass validation.
