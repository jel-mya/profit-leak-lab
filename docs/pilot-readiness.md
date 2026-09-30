# Connected pilot readiness

Status as of 13 September 2026: implemented, disabled, not ready for customer records.

The connected pilot includes verified sign-in, explicit business selection/onboarding, action creation, revision-checked edits, audit history and reported recovery entry/correction. The session demo remains separate; imports and session recovery history are never automatically uploaded.

## Verified delivery

Canonical commit `f42baab36224b7b7f141bc3ccaee99f0d309ca2b` passed [GitHub verification run 34696153408](https://github.com/jel-mya/profit-leak-lab/actions/runs/34696153408). That workflow installs locked dependencies, scans repository hygiene, runs unit/PostgreSQL tests, lints, builds the frontend and checks the emitted CSV worker and local production HTTP security. The suite contains 193 tests at this commit. This evidence covers a local Worker and synthetic PostgreSQL/Auth shims, not a deployed Supabase project or browser interaction.

## Remaining release work

1. Provision a disposable synthetic Supabase project and apply every committed migration. The recovery columns are required by current action reads. Follow [live Supabase checks](live-supabase-checks.md), supplying credentials privately and using its explicit synthetic-only gates.
2. Execute the read and write harnesses against that project. Record the tested commit, migration set, date and fixed pass/fail outcomes without credentials, identities or payloads. Recovery checks append to the newly created synthetic action and leave history behind.
3. Verify actual Auth expiry/revocation, onboarding concurrency, membership changes during writes and business-currency changes during recovery writes. The automated local suite does not establish these multi-connection/API behaviours.
4. Verify connected browser flows using synthetic records: owner/editor save, viewer denial, invalid recovery, successful zero correction, conflicting edits, uncertain response followed by read/acknowledgement, retained failed entry, sign-out during a request and action pagination. Check that acknowledgement does not silently replay a recovery.
5. Review the recorded evidence before enabling cloud configuration or accepting customer records. Preview publishing remains separately disabled; a successful repository push does not update the hosted preview.

Cross-session source reconciliation, raw-import persistence, billing and automatic accounting writes are not part of this implemented pilot. Keep them out of pilot readiness claims.

## Reusable synthetic UI browser acceptance — 30 September 2026

Promoted the earlier untracked run114 test fixture to `integration/browser-fixture/`, with an optional reproducible `npm run test:browser:pilot` command. On JHomeNuc, the command started its own localhost Vite fixture, exercised the actual connected workspace React component in headless Chrome and completed **11/11 synthetic browser acceptance checks**. These cover editor membership and pagination, unsaved-recovery warnings, navigation prevention, successful single-write recovery, viewer restrictions, rapid local clearance after simulated sign-out/revocation, and explicit conflict/uncertain-response review without automatic write replay.

A second, dependency-free Chrome DevTools runner is now available as `npm run test:browser:synthetic` and is required by GitHub CI. It reuses the same synthetic fixture and locally passed 8/8 cases: editor recovery save, viewer restrictions, conflict and uncertain-result explicit acknowledgement without replay, unsaved business navigation cancellation, pagination, invalid-recovery rejection, and access-loss clearance. This CI check does not require separately installed Puppeteer and is documented in [repeatable browser acceptance](browser-acceptance.md).

This is **mocked** Auth and a simulated Supabase adapter, not a live project or verified production permission boundary. The full live Supabase Auth/PostgREST/RLS and multi-connection gates listed above remain outstanding. The optional local browser harness depends on locally available Puppeteer/Chrome and is not part of the standard cross-platform CI pipeline; see `integration/browser-fixture/README.md`. No production configuration, deployment or real customer records changed.
