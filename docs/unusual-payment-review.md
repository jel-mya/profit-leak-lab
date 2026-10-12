# Different-amount supplier payment review

The Supplier payments tab includes a separate review of payments with the same
supplier ID and normalised invoice reference but different positive amounts.
It reuses the exact-duplicate engine's reference matching and input validation.
Amounts are calculated and displayed in integer minor units using the session
currency. Equal amounts, zero-only differences and different supplier IDs do
not create this signal. Zero rows remain available as source evidence in a
group containing at least two distinct positive amounts.

The review uses the existing supplier payments CSV import, mapping, reporting
period and apply/cancel flow. No extra columns, uploads, storage, account or
external service are introduced. Refreshing clears the session.

These matches can be legitimate instalments or adjustments. Review the invoice,
credits and payment evidence before drawing a conclusion. The feature does not
estimate loss, overpayment or recoverable cash. It does not add to the dashboard
investigation total or replace exact-duplicate checks; both signals may appear
for the same invoice.

Track creates an independent session action linked to the complete sorted source
ID set, the review settings and the import version. A `findingKind` of
`unusual-payment` separates its identity from an exact-duplicate action. The
export retains that marker; `amountMinorUnits: 0` means **unquantified** for this
kind, not a verified zero loss. The UI explicitly describes the amount as
unquantified. Equalising amounts, regrouping sources or replacing an import does
not close actions or infer recovery. Existing source-presence and reimport
warnings still apply. Saved actions can be downloaded before refreshing.

No bank-account-change, payment-date, fraud, GST, reconciliation or live
accounting-connector detection is claimed. The CSV does not supply evidence for
those checks. The connected workspace remains disabled by default and its live
security and customer-data release gates remain open.
