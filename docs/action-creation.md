# Retry-safe action creation contract

`202609080002_action_creation_requests.sql` adds `create_control_action` for an authenticated owner/editor. It accepts a caller-generated request UUID, business UUID and the five editable action fields. It derives the user from Auth, checks and locks membership, and writes the action, creation event and private request mapping atomically.

The request key is scoped to the authenticated caller. Repeat the same key and exactly the same original fields after an uncertain response: the RPC returns the existing action's current state, preserving later edits and adding no history. Changed fields or a changed authorised business with the same key return `PT409`. Missing request keys return `22023`. Anonymous, foreign-tenant, viewer and revoked-member calls are denied. A request UUID is a retry identifier, not an access credential.

The private mapping retains the original editable payload to compare replays even after the action changes. It has no client grants and must not be exposed through the Data API. Its references deliberately prevent silent deletion of retry evidence; retention/account deletion requires a separately approved policy. Do not expire mappings until a supported retry lifetime and retention design exist.

## Client integration

The connected-workspace adapter now uses the RPC. The coordinator generates one UUID per intended creation and retains the original draft/key after an uncertain error. Retrying identical values reuses the key. A changed draft is blocked until the pending request is explicitly abandoned after checking saved actions. The UI offers retry-original, reload-saved-actions and deliberate discard controls; it does not retry automatically.

Confirmed success clears the draft and key before refreshing the list, so a failed follow-up read cannot masquerade as an unsaved creation. Explicit database validation failures release the key. Uncertain failures and request conflicts retain it. Direct table inserts remain under the existing RLS/column grants for compatibility, but the app does not use them and they do not gain retry deduplication.

Keys and drafts are memory-only. Sign-out, switching businesses or reloading can lose the pending key; users must check saved actions before creating again. There is no cross-session deduplication promise. The UI explains this limitation. No drafts or tokens are placed in local storage.

## Verification

Local PostgreSQL tests verify repeat submission, one creation event, changed-payload conflict, caller scoping, private mapping denial, role/tenant denial, revoked replay and preservation of later revisions. They do not exercise simultaneous database connections, actual JWT/PostgREST behaviour or request loss over a real network. Test those in a disposable synthetic Supabase project before enabling this flow for customers. No live migration has been applied by this increment.
