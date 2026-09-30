# Retention date review (standalone preview)

The browser-only `/retentions` route analyses explicitly supplied retention release tranches. It does not send CSV data to a server, connect to an accounting system, or alter the main dashboard's investigation amount. The page is separate from the existing four import types and the connected workspace.

## Source contract

Download the blank template. Required columns: `id,jobId,counterparty,held,released,releaseDueDate`; optional `currency`. Use one unique ID per **distinct retention release tranche**, not a duplicate of a whole job's balance for each staged release. Dates must be verified against the actual contract and payment evidence. `releaseDueDate` is the date the user listed for review, **not** independent proof of a legally enforceable payment due date. `held` is the amount allocated to the tranche; `released` is the amount actually returned or credited, not merely certified or approved for release. Amounts must be non-negative with up to two decimals; `released` cannot exceed `held` in this simplified model. Reconcile adjustments separately before importing. File maximum: 2 MB and 10,000 records.

Select the currency first. If `currency` is present, every code must match. Otherwise explicitly confirm the whole export's currency. Users must also declare a consistent tax basis and verify listed dates. The app performs **no GST calculation**, tax-basis inference, exchange conversion or assessment of contractual eligibility.

## Interpreting the output

- Remaining held = held minus released for each tranche.
- Date reached/passed = remaining held on tranches with a listed date on or before the selected review date.
- Past listed date = the same comparison, but strictly before the review date. A date reached today is distinct from one already passed.
- Fully released tranches are not flagged even when their listed date is earlier.
- Amounts are investigation prompts, not collectible debt, missing cash, recoveries or fraud findings. Contractual release depends on milestones, defects periods, claims and variations that this CSV cannot verify.

Rows and calculations exist only in browser memory; refreshing clears them. JSON download is local and may contain confidential commercial data, so store it securely. Invalid imports leave the previous review untouched. To change the selected currency, first clear the loaded review; the application never relabels an imported amount.

## Quality and next gates

The independent engine has fixture tests for money arithmetic, date boundaries, zero balances, duplicate tranche IDs, CSV structure, mixed currencies, size/row validation and failure cases. The page uses the existing review styling and 50-row pagination. Browser interaction and any production deployment require separate verification. Future increments can link verified tranches to action tracking, add source-version reconciliation and a contract milestone model; do not merge these amounts into other cash exceptions until overlap has been explicitly resolved.
