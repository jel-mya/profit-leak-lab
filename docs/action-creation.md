# Retry-safe action creation contract

`202609080002_action_creation_requests.sql` adds `create_control_action` for an authenticated owner/editor. It accepts a caller-generated request UUID, business UUID and the five editable action fields. It derives the user from Auth, checks and locks membership, and writes the action, creation event and private request mapping atomically.

The request key is scoped to the authenticated caller. Repeat the same key and exactly the same original fields after an uncertain response: the RPC returns the existing action's current state, preserving later edits and adding no history. Changed fields or a changed authorised business with the same key return `PT409`. Missing request keys return `22023`. Anonymous, foreign-tenant, viewer and revoked-member calls are denied. A request UUID is a retry identifier, not an access credential.

The private mapping retains the original editable payload to compare replays even after the action changes. It has no client grants and must not be exposed through the Data API. Its references deliberately prevent silent deletion of retry evidence; retention/account deletion requires a separately approved policy. Do not expire mappings until a supported retry lifetime and retention design exist.

## Client integration still required

The current adapter still creates actions with a table insert. This migration alone does **not** make those existing requests retry-safe. Direct inserts remain under the existing RLS and restricted column grants for compatibility; they do not use the request mapping.

Switch the adapter to this RPC in a subsequent client increment. Generate one random UUID per intended creation and retain it through network errors. Do not automatically generate a fresh key after an uncertain response. Preserve the submitted fields and require explicit review before changing an unresolved request. Clear the pending key after confirmed success or deliberate abandonment following a review of saved actions. Sign-out/reload must clear sensitive local state; if the key is then lost, require checking saved actions before retrying rather than promising cross-session deduplication. Never add raw drafts or tokens to local storage implicitly.

## Verification

Local PostgreSQL tests verify repeat submission, one creation event, changed-payload conflict, caller scoping, private mapping denial, role/tenant denial, revoked replay and preservation of later revisions. They do not exercise simultaneous database connections, actual JWT/PostgREST behaviour or request loss over a real network. Test those in a disposable synthetic Supabase project before enabling this flow for customers. No live migration has been applied by this increment.
