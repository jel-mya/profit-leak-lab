# Connected recovery persistence contract

Migration `202609120001_action_recovery.sql` adds optional recovery amount (integer minor units), currency, date and evidence to actions. Existing rows retain null recovery fields. No recovery is inferred or backfilled.

The authenticated `record_action_recovery` RPC takes action ID, expected revision, amount, currency, date and evidence. It locks the action and authorised owner/editor membership, checks the expected revision, and requires the explicitly supplied currency to match the locked business currency. Zero with evidence supports corrections; negative or excessive amounts, incomplete fields, invalid supported dates and whitespace-only evidence fail validation.

The existing action triggers advance the revision and append before/after audit events atomically. Recovery writes preserve action status and ordinary outcome notes. Stale retries conflict rather than making a second silent write; clients must reload and reconcile uncertain responses. Do not automatically replay with a new revision. Direct client updates remain revoked, and existing column-level insert grants do not expose the new fields.

The Supabase port exposes `recordRecovery(id, revision, recovery)` and forwards only the expected revision and recovery fields to the RPC. Action list and individual reads include the nullable recovery fields. Server errors expose their code without private server messages; a stale revision remains `PT409` for explicit reconciliation.

The workspace controller validates recovery inputs and the selected business currency before calling the port with the loaded action revision. It serialises writes and discards late responses after sign-out or a business switch. Access denial or a malformed/foreign response clears cached access.

Conflicts and uncertain write outcomes enter `recoveryReview`, retaining the attempted values in memory and blocking further writes. `reloadRecoveryReview()` fetches the current action without writing. After presenting both versions, the UI must explicitly call `finishRecoveryReview()` to adopt the fresh row; this never replays the recovery. A subsequent correction is a separate explicit write against the newly loaded revision. Failed reloads invalidate earlier fetched rows. Sign-out or business selection discards the review, so these are session safeguards rather than durable retry records.

Apply the recovery migration before using this version of the connected port: its reads require the new columns. No live migration has run and cloud workspace configuration remains disabled. The session recovery interface is not connected to this RPC. Before enabling connected recovery, add UI integration for saving and the explicit recovery-review flow, plus actual Supabase API tests for grants, tenant isolation, competing updates, currency changes and revocation. Existing session recovery history is not automatically uploaded or reconciled.

Connected action cards and audit history display saved recovery fields, including zero corrections. History lists integer minor units with an explicit conversion explanation and separate currency entries. The write and uncertainty-review controls are not yet exposed in the UI; configuration remains disabled pending integration and live checks.
