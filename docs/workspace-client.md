# Authenticated workspace client foundation

`core/workspace.mjs` coordinates in-memory authenticated workspace state. `core/supabase-port.mjs` adapts the official Supabase JavaScript client to it. These modules are tested but are **not yet wired into the preview UI**. No live Auth request or customer persistence was enabled by this increment.

The caller must construct one Supabase client with a publishable key and the user's session, never a service-role key. The adapter calls Auth `getUser()` before loading memberships; it does not trust a locally decoded user object. The coordinator rejects missing, anonymous or unverified-email identities. Database RLS and RPC checks remain the authorisation boundary; these browser checks only control the experience.

Required UI integration:

1. Create a client with intentionally selected session storage and no financial data in local storage. Subscribe to Auth changes; call `disconnect()` synchronously on sign-out, account change or expiry, and call `connect()` after verified sign-in. `disconnect()` clears local state; it does **not** replace the SDK's actual sign-out call.
2. Subscribe to snapshots and explicitly choose a business returned by membership reads. Switching businesses clears old records immediately. Generation counters ignore responses from earlier sessions or tenant selections. Ignoring a response does not cancel a database write already accepted by the server.
3. Render the first action page and its `hasMore` flag. The adapter fetches at most 101 records to return 100 plus a continuation indicator; the future UI must provide page navigation before claiming a complete action list. The current coordinator only loads the first page.
4. Submit only editable fields. `save()` uses the revision from the loaded record, ignoring caller-supplied tenant/creator/revision properties. Saves are serialized locally; the database still checks revision and membership on every update.
5. On `PT409`, show the retained draft. `reloadConflict()` fetches the current action without writing. Only an explicit reconciliation through `resolveConflict(mergedDraft)` submits again using that fetched revision. A second conflict again requires reconciliation. Do not add automatic retries for conflicts or uncertain write outcomes.
6. Access-loss errors clear cached records and memberships. Network errors retain the last state and return a stable error code. The adapter strips database error messages so raw server details do not enter UI notifications or logs.

Onboarding is exposed through the adapter's `createBusiness(name,currency)` and follows [the onboarding contract](onboarding.md). After successful onboarding, refresh memberships through `connect()`. The modules do not send login emails, store tokens, implement password recovery or accept legal terms.

Validation uses injected service responses and records SDK query construction. It covers late login/read/save responses, tenant switching, conflict reconciliation, spoofed editable inputs, access revocation and bounded queries. It is not end-to-end Supabase or browser verification. Real SDK/Auth/PostgREST integration and nonce-based CSP remain release gates.

Official contracts consulted: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser) and [query modifiers](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal). No claim is made that request cancellation is implemented here.
