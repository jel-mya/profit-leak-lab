'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { parseRetentionCsv, retentionHeaders, reviewRetentions, type RetentionRow } from '../../../core/retentions.mjs';
import { pageWindow } from '../../../core/pagination.mjs';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const currencies = ['AUD', 'USD', 'GBP', 'CAD', 'NZD'];
const templateUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(retentionHeaders.join(',') + '\n');
const localDate = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};
export default function RetentionReview() {
  const [currency, setCurrency] = useState('AUD');
  const [asOf, setAsOf] = useState(localDate);
  const [rows, setRows] = useState<RetentionRow[] | null>(null);
  const [singleCurrency, setSingleCurrency] = useState(false);
  const [checkedBasis, setCheckedBasis] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const generation = useRef(0);
  const result = useMemo(() => {
    if (!rows) return null;
    try { return reviewRetentions(rows, asOf); } catch { return null; }
  }, [rows, asOf]);
  const window = pageWindow(result?.count ?? 0, page);
  const format = (cents: number) => new Intl.NumberFormat('en-AU', {
    style: 'currency', currency,
  }).format(cents / 100);

  async function loadCsv(file?: File) {
    if (!file) return;
    const current = ++generation.current;
    if (!checkedBasis) {
      setMessage('Confirm the consistent amount/tax basis and contract dates before importing.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('CSV exceeds the 2 MB file limit.');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      const parsed = parseRetentionCsv(text, currency, singleCurrency);
      const checked = reviewRetentions(parsed, asOf);
      if (current !== generation.current) return;
      setRows(parsed);
      setPage(0);
      setMessage(`Reviewed ${checked.count} retention records. Data stays in browser memory.`);
    } catch (error) {
      if (current === generation.current) {
        setMessage(error instanceof Error ? error.message : 'Unable to read CSV.');
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  function clearReview() {
    generation.current++;
    setRows(null);
    setPage(0);
    setMessage('Review cleared from this browser session.');
    setBusy(false);
  }
  function downloadReview() {
    if (!result) return;
    const blob = new Blob([JSON.stringify({
      reportType: 'retention-date-review', reviewedAt: new Date().toISOString(),
      currency, releaseDates: 'User supplied; not legally verified',
      amounts: 'Consistent tax basis as declared; no GST or currency conversion',
      ...result,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retention-review-${asOf}.json`;
    link.click();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="app-shell">
      <header className="brandbar">
        <Link className="brand" href="/">ProfitLeakLab <span className="product-tag">RETENTION REVIEW</span></Link>
        <span className="session-tag">Local browser review · no upload</span>
        <Link href="/">Financial control room</Link>
      </header>
      <main id="main" className="retention-review">
        <div className="heading-row">
          <div>
            <p className="eyebrow">TRADE FINANCIAL CONTROL</p>
            <h1>Review held retentions.</h1>
            <p className="muted">Spot unreleased balances against dates you supply. These are review prompts, not verified claims or recoverable cash.</p>
          </div>
          <a download="retention-template.csv" href={templateUrl}>Download blank CSV template</a>
        </div>
        <section className="retention-panel" aria-label="Retention import settings">
          <h2>1. Set review context</h2>
          <div className="retention-fields">
            <label>Review date <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} /></label>
            <label>Currency
              <select value={currency} disabled={rows !== null || busy} onChange={e => setCurrency(e.target.value)}>
                {currencies.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
          </div>
          <label className="retention-check"><input type="checkbox" checked={checkedBasis} onChange={e => setCheckedBasis(e.target.checked)} />
            I checked that the amounts use one consistent tax basis and that the listed dates came from the relevant contracts or payment records.
          </label>
          <label className="retention-check"><input type="checkbox" checked={singleCurrency} onChange={e => setSingleCurrency(e.target.checked)} />
            If my CSV has no currency column, I confirm every row uses the currency selected above.
          </label>
          <p className="muted">Required columns: {retentionHeaders.join(', ')}. Optional: currency. One row per distinct retention release tranche; do not repeat the same held balance across tranches. Maximum 2 MB / 10,000 rows.</p>
          <label className="retention-upload">2. Select retention CSV
            <input type="file" accept=".csv,text/csv" disabled={busy} onChange={e => {
              void loadCsv(e.target.files?.[0]);
              e.target.value = '';
            }} />
          </label>
          <div className="retention-actions">
            <Button variant="outline" onClick={clearReview} disabled={!rows && !busy}>Clear review</Button>
            <Button onClick={downloadReview} disabled={!result}>Download review JSON</Button>
          </div>
          {message && <output>{message}</output>}
        </section>
        {result && (
          <section className="retention-panel" aria-label="Retention results">
            <h2>3. Review exceptions</h2>
            <div className="retention-metrics">
              <div><span>Held</span><strong>{format(result.held)}</strong></div>
              <div><span>Released</span><strong>{format(result.released)}</strong></div>
              <div><span>Remaining held</span><strong>{format(result.open)}</strong></div>
              <div><span>Date reached / passed</span><strong>{format(result.reviewAmount)}</strong><small>{result.flaggedCount} records to check</small></div>
              <div><span>Past listed date only</span><strong>{format(result.pastDateAmount)}</strong></div>
            </div>
            <p className="muted">Passing a listed date does not establish contractual eligibility, overdue debt or a recovery. Verify milestones, defects periods, claims and any builder adjustments before taking action. No tax is calculated.</p>
            <Table>
              <TableHeader><TableRow>
                {['ID', 'Job', 'Counterparty', 'Held', 'Released', 'Remaining', 'Listed release date', 'Review status'].map(h =>
                  <TableHead key={h}>{h}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {result.items.slice(window.start, window.end).map(item => <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell><TableCell>{item.jobId}</TableCell><TableCell>{item.counterparty}</TableCell>
                  <TableCell>{format(item.held)}</TableCell><TableCell>{format(item.released)}</TableCell>
                  <TableCell>{format(item.remaining)}</TableCell><TableCell>{item.releaseDueDate}</TableCell><TableCell>{item.state}</TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
            <nav aria-label="Retention pages" className="retention-actions">
              <span>Records {result.count ? window.start + 1 : 0}–{window.end} of {result.count}</span>
              <Button variant="outline" disabled={!window.previous} onClick={() => setPage(window.page - 1)}>Previous</Button>
              <span>Page {window.page + 1} of {window.pages}</span>
              <Button variant="outline" disabled={!window.next} onClick={() => setPage(window.page + 1)}>Next</Button>
            </nav>
          </section>
        )}
      </main>
    </div>
  );
}
