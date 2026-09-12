# Connected recovery persistence contract

Migration `202609120001_action_recovery.sql` adds optional recovery amount (integer minor units), currency, date and evidence to actions. Existing rows retain null recovery fields. No recovery is inferred or backfilled.

The authenticated `record_action_recovery` RPC takes action ID, expected revision, amount, currency, date and evidence. It locks the action and authorised owner/editor membership, checks the expected revision, and requires the explicitly supplied currency to match the locked business currency. Zero with evidence supports corrections; negative or excessive amounts, incomplete fields, invalid supported dates and whitespace-only evidence fail validation.

The existing action triggers advance the revision and append before/after audit events atomically. Recovery writes preserve action status and ordinary outcome notes. Stale retries conflict rather than making a second silent write; clients must reload and reconcile uncertain responses. Do not automatically replay with a new revision. Direct client updates remain revoked, and existing column-level insert grants do not expose the new fields.

This is a database contract only. The session recovery interface is not connected to this RPC, and no live migration has run. Before enabling connected recovery, add adapter/controller/UI integration and actual Supabase API tests for grants, tenant isolation, competing updates, currency changes and revocation. Existing session recovery history is not automatically uploaded or reconciled.
