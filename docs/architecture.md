# Architecture and security boundary

The first working increment is a stateless review application, not yet an authenticated production SaaS. React/Vinext renders a Cloudflare-compatible frontend. The pure engine in `core/` operates in the browser; CSV content never enters an API request. No imports, actions or health answers go into browser storage, telemetry, cookies, logs or the database. Actions can be explicitly downloaded as JSON. Refreshing loses session state.

The initial date and records are fixed fictional demo fixtures. Importing a first file atomically removes all demo records; later imports replace one section. Failed validation preserves the prior dataset. CSV supports quoted fields, BOM and CRLF. Reject unexpected headers, duplicate IDs, malformed dates, negative amounts, unsafe integers, more than 10,000 rows or more than 2 MB per file. React escapes text. Exported actions use JSON to avoid spreadsheet formula execution.

## Supabase-ready persistence

`supabase/migrations/202609060001_tenant_foundation.sql` provides businesses, memberships and actions. All public tables use row-level security. Anonymous access has no table grants; authenticated reads require membership. Editors/owners can create/update actions; viewers cannot. Membership changes and business provisioning are unavailable to clients. Column privileges prevent moving an action to another tenant or rewriting its creator. Membership checks live in a non-exposed private schema with a fixed empty search path and restricted execution privileges.

Do not expose the private schema in the Supabase Data API. Future frontend connections use only a publishable key plus the user's verified Supabase Auth session. A service-role key must never be bundled or sent to the browser. Do not trust client-supplied tenant IDs or JWT user metadata for authorisation. Use RLS even when the application checks membership. No real project or credentials have been configured and the migration must pass live RLS tests before production use.

Reference: [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## Database security tests

`tests/database.test.mjs` executes all checked-in migrations against PostgreSQL through PGlite in memory. It creates minimal `auth.users` and `auth.uid()` test shims, then uses `SET LOCAL ROLE` and synthetic identities to exercise actual database grants, RLS and triggers. Each caller session rolls back; there are no customer records, credentials or on-disk databases.

Thirteen scenarios cover anonymous access, owner/editor/viewer permissions, outsiders and missing identities, cross-tenant reads/writes, forged creators, immutable identity/timestamp columns, prohibited client provisioning/deletes, explicit multi-business roles, immediate membership revocation, private helper execution and unchanged foreign-tenant data after failed writes. The standard CI test command runs this suite; migrations must continue to satisfy the contract.

This verifies the SQL security layer, not Supabase JWT verification, PostgREST schema exposure, project-specific default privileges, session expiry or deployed API behaviour. The identity claim is deliberately supplied by the test harness, never accepted as a trusted user ID by the future application. Repeat these access cases through a disposable Supabase project's actual API before enabling persistent customer data.

## Production gates

Before storing real customer financial data: execute the migration and two-tenant/anonymous/viewer tests against disposable Supabase; implement Auth sign-in/sign-out and session expiry; explicit membership provisioning; protect updates with concurrency control and append-only audit history; verify retention/deletion, backups/restores and privacy terms; restrict redirect origins and review deployed CSP. Accounts/terms/protected credentials require the user's action. Billing and recovery/payment actions are not implemented.

Never commit exports, credentials, customer records or database backups. Keep demo data fictional. Dependencies are locked; assess audit results instead of applying forced major upgrades. Security headers must be applied to Worker HTML responses as well as static files; Cloudflare `_headers` alone does not protect Worker-generated HTML. [Cloudflare header guidance](https://developers.cloudflare.com/pages/configuration/headers/).
