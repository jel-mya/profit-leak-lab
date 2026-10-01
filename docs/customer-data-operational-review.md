# Customer-data operational and privacy release review

Status: **release gate, not approval**.

This checklist prepares the evidence required before ProfitLeakLab may accept real customer financial records. Completing repository tests does not satisfy this gate. Record evidence without copying customer data, credentials, tokens, private URLs or authentication payloads into Git.

## Decision rule

Customer-data storage remains disabled unless every **Required** item below is either:

- **PASS** with dated evidence and an accountable reviewer; or
- **NOT APPLICABLE** with a written reason accepted by the reviewer.

Any **FAIL**, **UNKNOWN** or blank Required item blocks customer-data enablement.

## Evidence record

For each item record:

| Field | Required content |
| --- | --- |
| Review date | ISO date |
| Tested commit | Full canonical Git commit SHA |
| Environment | Disposable synthetic / staging / production-control review |
| Result | PASS / FAIL / UNKNOWN / NOT APPLICABLE |
| Evidence | Non-secret reference: CI run, approved internal record, policy/version, screenshot reference or test report |
| Reviewer | Accountable human reviewer |
| Follow-up | Owner and due date for FAIL/UNKNOWN |

Do not record passwords, API keys, session tokens, customer identifiers, raw financial rows or private authentication responses.

## Required controls

### 1. Data inventory and purpose

- [ ] **Required:** Document every customer-data category the enabled product can receive, create or derive.
- [ ] **Required:** Map each category to its business purpose and the screen/API/database location that handles it.
- [ ] **Required:** Confirm optional browser-only imports are not silently persisted or uploaded.
- [ ] **Required:** Identify derived investigation findings, actions, recovery records and audit history separately from source accounting data.
- [ ] **Required:** Confirm demo/synthetic records are clearly distinguishable from customer records.

### 2. Collection and minimisation

- [ ] **Required:** Confirm each collected field is necessary for the enabled workflow.
- [ ] **Required:** Confirm secrets and administrator/service-role credentials cannot be submitted through customer-facing fields.
- [ ] **Required:** Confirm logs, analytics and error reporting do not capture imported financial rows, credentials or authentication payloads.
- [ ] **Required:** Review file-size, row-count, identifier and free-text bounds against abuse and accidental over-collection.

### 3. Authentication and tenant isolation

- [ ] **Required:** Record a successful disposable live Supabase Auth/PostgREST/RLS run for the exact release commit.
- [ ] **Required:** Record true multi-connection/concurrency verification for revision-sensitive writes.
- [ ] **Required:** Verify expiry/revocation and membership changes invalidate access without stale-data restoration.
- [ ] **Required:** Verify anonymous, viewer and foreign-tenant denial through the real API.
- [ ] **Required:** Confirm no frontend configuration contains a service-role/admin key.

These items must reference live synthetic evidence; local PGlite or mocked browser fixtures alone cannot pass them.

### 4. Browser and session behaviour

- [ ] **Required:** Verify native-route behaviour using the production-style application route.
- [ ] **Required:** Verify real browser close/refresh behaviour for unsaved entries and document browser-dependent limitations.
- [ ] **Required:** Verify sign-out clears sensitive in-memory state and a subsequent user cannot see the prior user's data.
- [ ] **Required:** Verify conflict/uncertain-write acknowledgement never silently replays a financial write.
- [ ] **Required:** Confirm downloaded action/evidence files are intentionally user-triggered and documented as sensitive local files.

### 5. Storage, retention and deletion

- [ ] **Required:** Identify the approved hosting/database regions and actual storage locations before customer enablement.
- [ ] **Required:** Define retention periods for account data, financial actions, audit history, support records and operational logs.
- [ ] **Required:** Define deletion/closure handling, including records intentionally retained for audit integrity.
- [ ] **Required:** Verify backup retention and restoration behaviour against the retention/deletion decision.
- [ ] **Required:** Define how a customer can request access, correction or deletion and who owns the response.

Do not promise deletion of append-only audit history until the legal/operational retention decision is documented.

### 6. Security operations

- [ ] **Required:** Confirm least-privilege access for administrators and support personnel.
- [ ] **Required:** Confirm MFA requirements for privileged accounts.
- [ ] **Required:** Define credential rotation/revocation procedure and emergency access ownership.
- [ ] **Required:** Define vulnerability/dependency review cadence and patch ownership.
- [ ] **Required:** Define incident triage, containment, evidence preservation, customer communication and escalation contacts.
- [ ] **Required:** Verify production logs provide useful security evidence without storing prohibited sensitive payloads.

### 7. Availability and recovery

- [ ] **Required:** Define backup ownership and expected recovery objective for persisted customer actions.
- [ ] **Required:** Perform and record a synthetic restore/recovery exercise before relying on backups.
- [ ] **Required:** Define behaviour when Supabase or hosting is unavailable so uncertain writes are not represented as successful.
- [ ] **Required:** Confirm customers can distinguish saved server state from unsaved browser state.

### 8. Privacy and customer communications

- [ ] **Required:** Have the applicable privacy notice and customer-facing collection statements reviewed before enablement.
- [ ] **Required:** Ensure customer claims match actual product behaviour, including browser-only versus persisted data.
- [ ] **Required:** Document subprocessors/services that receive customer data and the purpose of each.
- [ ] **Required:** Confirm support and troubleshooting procedures prohibit copying real customer records into development fixtures, Git, screenshots or AI prompts without an approved process.
- [ ] **Required:** Record the approved process for privacy enquiries and suspected data incidents.

This repository checklist is an engineering/operations evidence gate. It is not legal advice and does not itself determine statutory privacy obligations.

## Final enablement record

Do not enable real customer storage from an automated run.

A human-controlled enablement decision must record:

- exact canonical release SHA;
- successful live synthetic Auth/PostgREST/RLS evidence;
- successful true concurrency evidence;
- native-route and real close/refresh browser evidence;
- this operational/privacy checklist outcome;
- unresolved risks and explicit acceptance owner;
- date and person authorising customer-data enablement.

If canonical code changes in a way that affects authentication, authorisation, persistence, audit history, data handling or browser session behaviour after review, reassess the affected controls before release.
