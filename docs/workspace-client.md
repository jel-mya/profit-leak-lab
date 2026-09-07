# Authenticated workspace client foundation

`core/workspace.mjs` coordinates in-memory authenticated workspace state. `core/supabase-port.mjs` adapts the official Supabase JavaScript client to it. The opt-in `/workspace` screen now uses these modules. The hosted preview remains disabled until a Supabase project is configured.

The caller must construct one Supabase client with a publishable key and the user's session, never a service-role key. The adapter calls Auth `getUser()` before loading memberships; it does not trust a locally decoded user object. The coordinator rejects missing, anonymous or unverified-email identities. Database RLS and RPC checks remain the authorisation boundary; these browser checks only control the experience.

Implemented UI contract:

1. Create a client with intentionally selected session storage and no financial data in local storage. Subscribe to Auth changes; call `disconnect()` synchronously on sign-out, account change or expiry, and call `connect()` after verified sign-in. `disconnect()` clears local state; it does **not** replace the SDK's actual sign-out call.
2. Subscribe to snapshots and explicitly choose a business returned by membership reads. Switching businesses clears old records immediately. Generation counters ignore responses from earlier sessions or tenant selections. Ignoring a response does not cancel a database write already accepted by the server.
3. Render the first action page and its `hasMore` flag. The adapter fetches at most 101 records to return 100 plus a continuation indicator; the screen provides previous/next page navigation using validated offsets.
4. Submit only editable fields. `save()` uses the revision from the loaded record, ignoring caller-supplied tenant/creator/revision properties. Saves are serialized locally; the database still checks revision and membership on every update.
5. On `PT409`, show the retained draft. `reloadConflict()` fetches the current action without writing. Only an explicit reconciliation through `resolveConflict(mergedDraft)` submits again using that fetched revision. A second conflict again requires reconciliation. Do not add automatic retries for conflicts or uncertain write outcomes.
6. Access-loss errors clear cached records and memberships. Network errors retain the last state and return a stable error code. The adapter strips database error messages so raw server details do not enter UI notifications or logs.

Onboarding is exposed through the adapter's `createBusiness(name,currency)` and follows [the onboarding contract](onboarding.md). After successful onboarding, refresh memberships through `connect()`. The modules do not send login emails, store tokens, implement password recovery or accept legal terms.

Validation uses injected service responses and records SDK query construction. It covers late login/read/save responses, tenant switching, conflict reconciliation, spoofed editable inputs, access revocation and bounded queries. It is not end-to-end Supabase or browser verification. Real SDK/Auth/PostgREST integration remains a release gate. Production HTML uses a per-request nonce CSP.

Official contracts consulted: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser) and [query modifiers](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal). No claim is made that request cancellation is implemented here.

## Pilot configuration

Set Worker environment variables CLOUD_WORKSPACE_ENABLED=true, SUPABASE_URL=https://YOUR-PROJECT.supabase.co and SUPABASE_PUBLISHABLE_KEY to a modern public sb_publishable key, after applying all migrations and completing live isolation checks. The default is disabled. Invalid settings fail closed. /api/workspace-config returns only these validated public connection settings with no-store caching. Service-role and legacy JWT keys are rejected.

The pilot accepts existing verified email/password accounts. Sessions are held in memory and refresh loses sign-in. Sign-out clears records immediately and ends the local SDK session. No registration, password recovery, invitations or audit-history viewer is provided yet. Review operational/privacy requirements in architecture.md before real customer use.

Access errors during business reads and onboarding now use the same clear-state boundary as action writes. Unexpected foreign-tenant responses also clear access. Network page errors clear rows and paging but retain verified membership choices for an explicit retry. Late failed requests cannot invalidate a newer session or business selection. These checks do not detect silent server revocation until a request exposes the change; RLS remains authoritative.
