# Starter-business onboarding contract

The database RPC is ready for a future Supabase-authenticated UI. It has not been deployed to a live project. No public sign-up or persistent-data feature is enabled in the current preview.

Call `public.create_business(p_name text, p_currency text)` using the authenticated user's access token. The only accepted inputs are a business name and supported currency; there is no caller-supplied user ID, tenant ID or membership role. Names are trimmed and limited to 1–200 characters. Currency must be AUD, USD, GBP, CAD or NZD.

The function creates a new business, grants the current Auth subject owner membership, and records a private onboarding mapping in one transaction. One identity can self-create one starter business. Additional businesses or client memberships require a separate, explicitly authorised provisioning flow. A matching business name is never an invitation to an existing tenant.

Matching retries return the same business, including after a network timeout. A changed name/currency returns `PT409` rather than silently changing the existing business or creating another one. The UI should load the user's memberships and offer to continue with the existing business. The private mapping is not readable or writable through client grants. Advisory transaction locking serializes requests for one identity; the mapping's unique constraints remain a second database safeguard.

Missing identity or revoked/downgraded ownership returns `42501`. Replaying onboarding cannot recreate revoked membership. Invalid fields return `22023`. Errors roll back business, membership and mapping together. Do not replace these checks with user-editable JWT metadata or a service-role request made on behalf of an unverified client.

Before enabling the flow: configure and test real Supabase Auth, verified-email requirements, disabled anonymous sign-ins, sign-up abuse/rate limits, allowed redirect origins and logout/session expiry. Run multi-connection retry tests through PostgREST and verify API error mapping. PGlite tests exercise the database contract with synthetic identity shims; they do not verify the production Auth gateway or email delivery.

The mapping deliberately retains a reference to the created business and user. Retention/account deletion needs a privileged, tested policy before launch; clients must not delete their mapping to reset the creation limit.
