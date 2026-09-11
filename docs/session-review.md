# Working through a session review

1. Choose the currency, review date and margin target before importing. Start with one consistent currency and tax basis. Currency cannot be relabelled while private records or an import are loaded.
2. Export CSV UTF-8. Map only needed columns, optionally validate a currency-code column, and review the preview. Enter balances-at for debtors, cumulative-through for jobs, or start/end dates for payments and labour. Date warnings do not adjust figures. Apply replaces that section; the first applied import removes all demo data.
3. Track the financial exceptions needing follow-up. Original amounts and reporting dates stay attached through source/version references. Later imports show whether original IDs remain present and whether the same exact finding still exists. Neither check establishes loss, recovery or resolution.
4. Assign an owner and due date. Use Unfinished, Overdue or Needs details to organise work. Overdue uses the selected review date, not an independently advancing clock. Closed includes resolved and dismissed actions; it does not mean money was recovered.
5. Record an evidence/outcome note before closing an action. If money was recovered, separately enter the supported amount, currency context, recovery date and evidence under User-reported recovery. This claim is not independently verified and never reduces investigation totals automatically. Correct a mistaken claim with zero and an explanation. Saved corrections retain earlier before/after entries in this session.
6. Unsaved recovery amount, date and evidence survive action filters and tab changes within this session. The unsaved-draft count includes hidden actions. Save explicitly to update the recovery record and history; Discard unsaved recovery edits resets only that action to its last saved values. Save before downloading or leaving the page. Expand recovery history to inspect the latest five revisions; download actions for all saved revisions and import-version metadata. The download includes every action regardless of the current filter.

## What survives

Nothing is persisted by the review dashboard. Refreshing, clearing the session or closing the tab can remove records, checklist answers, drafts, actions and history. The browser exit warning is best effort and is not crash recovery. Download actions and retain original CSV exports before leaving.

The action download contains action evidence and reporting metadata, not the original CSV rows or a full restorable review. There is no action-download restore flow. Downloads may contain private financial information; keep them out of Git. See [download format](action-download.md).

The separate connected workspace is disabled pending live Supabase verification. Session recoveries and their history are not synced to it. Device timestamps in session history are not trusted server audit timestamps.
