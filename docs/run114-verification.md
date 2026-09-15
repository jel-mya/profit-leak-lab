# Run114 reconciliation and verification

Verified on 2026-09-15 against freshly fetched `origin/main` at
`0ec0c02269eead2063435f5d33c3cea70ad77587`.
The supplied archive described an older base, `31993d7`. The integration preserves
the newer collapsed-entry indicator and consolidates the exit warning into the
workspace dirty registry. No upstream changes were missing at reconciliation.

## Canonical checks

- Full Node suite: 205 passed, including database tests and 11 navigation tests.
- Application lint: passed.
- Production build: passed.
- Emitted CSV worker smoke: passed.
- Local production HTTP security smoke: passed (routes, fresh CSP nonces,
  security headers, disabled workspace configuration).
- Repository hygiene and diff whitespace checks: passed.

## Browser acceptance evidence

Used a temporary, ignored local fixture on loopback with the actual
`CloudWorkspace`, `ConnectedRecovery`, and workspace controller. Auth and the
Supabase port used synthetic responses. The fixture replaced Next Link with an
anchor and exposed configurable confirmation results, a confirmation log, a
synthetic write counter, and an unload-event probe. This tests rendered component
behaviour; it is not deployed Next routing or live Supabase verification.

An initial unmodified `window.confirm` displayed the expected singular warning.
The browser tool could not retrieve or dismiss that native dialog and its next
accessibility request timed out. Remaining cases used the observable confirmation
fixture. No production confirmation behaviour was replaced.

| Included case | Result in synthetic browser fixture |
| --- | --- |
| 1. Amount, Switch business, Cancel | Passed: amount and current action remained. |
| 2. Amount, Switch business, Confirm | Passed: returned to business chooser. |
| 3. Evidence blocks Sign out | Passed: signed-in workspace and evidence remained. |
| 4. Draft blocks Previous | Passed: action page 100 remained. |
| 5. Draft blocks Next | Passed: action page 0 remained. |
| 6. Draft blocks Demo link | Passed for the component click handler using the fixture anchor. |
| 7. Refresh/close native protection | Partial: real handler cancels a synthetic unload event when dirty and detaches when clean. Native refresh/close warning was not verified; the refresh API exposed no dialog. |
| 8. Successful save removes warning | Passed: one synthetic write, cleared fields, revision advanced, unload handler clean. |
| 9. Discard removes warning | Passed: clean unload and pagination without confirmation. |
| 10. Validation error keeps warning | Passed: negative amount rejected, zero writes, unload protected. |
| 11. PT409 keeps warning | Passed: attempted fields retained, sign-out blocked. |
| 12. Uncertain save keeps warning | Passed: attempted fields retained, sign-out blocked, unload protected. |
| 13. Remote access loss clears without prompt | Passed: sign-in UI, no confirmation, clean unload. |
| 14. Viewer never registers draft | Passed: no recovery form; clean unload. |
| 15. Multiple dirty actions | Passed: a single count-aware warning naming two entries. |

Conflict review reload and acknowledgement also retained the attempted local
entry and its unload protection. The synthetic write count remained one, proving
the tested review path did not replay the write.

An additional failure-path check approved navigation while creating a new action,
then simulated a creation failure. The recovery amount, new-action title, and
unload protection remained. The registry is now cleared only after creation
succeeds and the action-list reload will actually discard the recovery forms.

## Remaining verification limits

The complete native browser acceptance gate remains open. Verify refresh/close
with an interactive browser and the actual Next route transition before enabling
the connected pilot. Browser Back/Forward and future route links are outside this
patch's click-handler coverage. Live Supabase checks and deployment remain
separate gates. No real data, live database writes, or deployment were used here.
