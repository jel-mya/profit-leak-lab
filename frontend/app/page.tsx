'use client';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ShieldCheck,
  Download,
  Upload,
  CircleDollarSign,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  analyse,
  controls,
  controlHealth,
  sections,
  dateValue,
} from '../../core/engine.mjs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import { pageWindow } from '../../core/pagination.mjs';
import { demo, demoDate } from '../../core/demo.mjs';
import { applyCsvPreview, parseCsv, template } from '../../core/csv.mjs';
import { useReviewTool } from '@/lib/use-review-tool';

type Data = Record<string, Record<string, string | number>[]>;
type Action = {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: string;
  note: string;
};
const empty: Data = { jobs: [], debtors: [], payments: [], labour: [] };
const names: Record<string, string> = {
  jobs: 'Job profitability',
  debtors: 'Debtor risk',
  payments: 'Supplier payments',
  labour: 'Labour variance',
};
function Choice({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
    >
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Grid({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  const [requestedPage, setPage] = useState(0);
  const window = pageWindow(rows.length, requestedPage);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.slice(window.start, window.end).map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j}>{cell}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={headers.length}>
                No records loaded. Import a CSV to check this control.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {rows.length > 0 && (
        <div className="table-paging">
          <p aria-live="polite">
            Records {window.start + 1}–{window.end} of {rows.length}. Totals
            include all records.
          </p>
          {window.pages > 1 && (
            <Pagination aria-label="Review table pages">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    disabled={!window.previous}
                    onClick={() => setPage(0)}
                  >
                    First
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    disabled={!window.previous}
                    onClick={() => setPage(window.page - 1)}
                  >
                    Previous
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <span>
                    Page {window.page + 1} of {window.pages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    disabled={!window.next}
                    onClick={() => setPage(window.page + 1)}
                  >
                    Next
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="outline"
                    disabled={!window.next}
                    onClick={() => setPage(window.pages - 1)}
                  >
                    Last
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </>
  );
}
export default function Home() {
  const [data, setData] = useState<Data>(demo);
  const [dataVersion, setDataVersion] = useState(0);
  const [mode, setMode] = useState('Demo');
  const [asOf, setAsOf] = useState(demoDate);
  const [currency, setCurrency] = useState('AUD');
  const [target, setTarget] = useState(25);
  const [tab, setTab] = useState('overview');
  const [section, setSection] = useState('jobs');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [actions, setActions] = useState<Action[]>([]);
  const [title, setTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const importGeneration = useRef(0);
  const [preview, setPreview] = useState<{
    section: string;
    rows: Record<string, string>[];
  } | null>(null);
  function cancelImport() {
    importGeneration.current++;
    setPreview(null);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }
  const result = useMemo(
    () => analyse(data, asOf, target),
    [data, asOf, target],
  );
  const health = controlHealth(answers);
  useReviewTool({
    currency,
    asOf,
    investigationMinorUnits: result.investigation,
    coverage: result.coverage,
  });
  const cash = (cents: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  const pct = (value: number | null) =>
    value === null ? 'No revenue' : `${value.toFixed(1)}%`;
  function addAction(value: string) {
    if (!value.trim()) return;
    if (actions.some((a) => a.title === value)) {
      setMessage('This item is already in your action list.');
      setTab('actions');
      return;
    }
    setActions((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        title: value.trim(),
        owner: '',
        due: '',
        status: 'Open',
        note: '',
      },
    ]);
    setTitle('');
    setMessage('Action added. Assign an owner and due date.');
    setTab('actions');
  }
  function updateAction(id: string, patch: Partial<Action>) {
    setActions((old) => old.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function download(content: string, name: string) {
    const url = URL.createObjectURL(
      new Blob([content], { type: 'text/plain;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importFile(file?: File) {
    if (!file) return;
    const generation = ++importGeneration.current;
    const selectedSection = section;
    setPreview(null);
    setBusy(true);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('CSV exceeds 2 MB.');
      const rows = parseCsv(await file.text(), selectedSection);
      if (generation !== importGeneration.current) return;
      setPreview({ section: selectedSection, rows });
      setMessage(
        'CSV checked. Review the preview, then apply it. Current records have not changed.',
      );
    } catch (error) {
      if (generation === importGeneration.current)
        setMessage(
          error instanceof Error
            ? error.message
            : 'Import failed. Previous data retained.',
        );
    } finally {
      if (generation === importGeneration.current) {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    }
  }
  function applyImport() {
    if (!preview) return;
    try {
      const next = applyCsvPreview(
        data,
        preview,
        mode === 'Demo',
        asOf,
        target,
      );
      setData(next);
      setDataVersion((v) => v + 1);
      setMode('Private session');
      if (mode === 'Demo') {
        setActions([]);
        setAnswers({});
      }
      setMessage(
        `${preview.rows.length} ${preview.section} records loaded. ${mode === 'Demo' ? 'All demo records cleared. ' : ''}Previous records for this section replaced.`,
      );
      cancelImport();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Import could not be applied. Previous data retained.',
      );
    }
  }
  const track = (label: string) => (
    <Button variant="outline" size="sm" onClick={() => addAction(label)}>
      Track <ArrowUpRight size={14} />
    </Button>
  );
  return (
    <div className="app-shell">
      <header className="brandbar">
        <a href="#main" className="brand">
          <span className="brand-mark">
            <CircleDollarSign size={24} />
          </span>{' '}
          ProfitLeakLab
          <span className="product-tag">TRADE FINANCIAL CONTROL</span>
        </a>
        <span className="session-tag">
          <ShieldCheck size={15} /> {mode} · browser memory only
        </span>
        <Link href="/workspace">Connected workspace</Link>
      </header>
      <main id="main">
        <div className="heading-row">
          <div>
            <p className="eyebrow">YOUR FINANCIAL CONTROL ROOM</p>
            <h1>See what needs attention.</h1>
            <p className="muted">
              Find the exceptions. Assign the follow-up. Stay in control.
            </p>
          </div>
          <Button onClick={() => setTab('import')}>
            <Upload size={16} /> Import your data
          </Button>
        </div>
        <div className="settings">
          <label>
            As of
            <Input
              type="date"
              value={asOf}
              onChange={(e) => {
                try {
                  dateValue(e.target.value);
                  setAsOf(e.target.value);
                  setMessage('');
                } catch {
                  setMessage('Choose a valid as-of date.');
                }
              }}
            />
          </label>
          <label>
            Currency
            <Choice
              label="Currency"
              value={currency}
              onChange={setCurrency}
              items={['AUD', 'USD', 'GBP', 'CAD', 'NZD']}
            />
          </label>
          <label>
            Target margin (%)
            <Input
              type="number"
              min="0"
              max="100"
              value={target}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 0 && n <= 100) setTarget(n);
              }}
            />
          </label>
          <p>
            One currency per analysis. Changing currency relabels amounts; it
            does not convert them.
          </p>
        </div>
        {mode === 'Demo' && (
          <div className="demo-banner">
            FICTIONAL DEMO{' '}
            <span>
              Explore a sample trade business, or import your own exports. Your
              first import clears every demo record.
            </span>
          </div>
        )}
        <output aria-live="polite" className="feedback">
          {message}
        </output>
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <div className="tab-scroll">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {Object.entries(names).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="health">Control health</TabsTrigger>
              <TabsTrigger value="actions">
                Actions (
                {
                  actions.filter(
                    (a) => !['Resolved', 'Dismissed'].includes(a.status),
                  ).length
                }
                )
              </TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="overview">
            <div className="summary-grid">
              <section className="investigation">
                <p className="eyebrow">MONEY REQUIRING INVESTIGATION</p>
                <strong>{cash(result.investigation)}</strong>
                <p>Overdue receivables + potential extra supplier payments.</p>
                <div className="split">
                  <span>
                    Overdue debtors <b>{cash(result.overdue)}</b>
                  </span>
                  <span>
                    Possible duplicates <b>{cash(result.duplicateExposure)}</b>
                  </span>
                </div>
                <small>
                  Not confirmed loss or guaranteed recovery. Applies to loaded
                  records only.
                </small>
              </section>
              <section className="stat">
                <p>Weighted job margin</p>
                <strong>{pct(result.margin)}</strong>
                <span>{cash(result.profit)} gross profit</span>
                <small>
                  Across {result.jobs.length} loaded jobs · target {target}%
                </small>
              </section>
              <section className="stat">
                <p>Control health</p>
                <strong>
                  {health.score === null ? 'Unassessed' : `${health.score}%`}
                </strong>
                <span>
                  {health.answered} of {health.total} controls answered
                </span>
                <Button variant="outline" onClick={() => setTab('health')}>
                  Review controls <ArrowUpRight size={14} />
                </Button>
              </section>
            </div>
            <div className="panel-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">START HERE</p>
                    <h2>Priority investigations</h2>
                  </div>
                  <span className="pill">Evidence first</span>
                </div>
                <Grid
                  key={dataVersion}
                  headers={['Exception', 'Amount', 'Next step']}
                  rows={[
                    ...result.debtors
                      .filter((d) => d.days > 0 && d.outstanding > 0)
                      .sort((a, b) => b.days - a.days)
                      .slice(0, 5)
                      .map((d) => [
                        <>
                          <b>{d.customer}</b>
                          <small>
                            {d.days} days overdue · {d.id}
                          </small>
                        </>,
                        cash(d.outstanding),
                        track(`Follow up debtor ${d.id}: ${d.customer}`),
                      ]),
                    ...result.duplicates.slice(0, 5).map((d) => [
                      <>
                        <b>{d.supplier}</b>
                        <small>Possible duplicate · {d.invoice}</small>
                      </>,
                      cash(d.amount),
                      track(`Investigate payments ${d.paymentIds.join(', ')}`),
                    ]),
                  ]}
                />
              </section>
              <section className="panel">
                <p className="eyebrow">COST SIGNALS</p>
                <h2>Keep these in view</h2>
                <div className="signal">
                  <span>Job margin shortfall</span>
                  <b>{cash(result.jobShortfall)}</b>
                </div>
                <div className="signal">
                  <span>Unapproved labour value</span>
                  <b>{cash(result.labourExposure)}</b>
                </div>
                <p className="muted">
                  These may overlap with job costs or supplier payments. They
                  are excluded from the investigation total.
                </p>
                <hr />
                <h3>Data coverage</h3>
                {sections.map((s) => (
                  <div className="coverage" key={s}>
                    <span>{names[s]}</span>
                    <span>
                      {result.coverage[s]
                        ? `${result.coverage[s]} rows`
                        : 'Not assessed'}
                    </span>
                  </div>
                ))}
              </section>
            </div>
          </TabsContent>
          <TabsContent value="jobs">
            <section className="panel">
              <h2>Job profitability</h2>
              <p className="muted">
                Gross profit after materials, subcontractors, labour and other
                costs. Shortfall is relative to your target margin.
              </p>
              <Grid
                key={dataVersion}
                headers={[
                  'Job',
                  'Revenue',
                  'Cost',
                  'Gross profit',
                  'Margin',
                  'Shortfall',
                  'Action',
                ]}
                rows={result.jobs.map((j) => [
                  <>
                    <b>{j.name}</b>
                    <small>{j.id}</small>
                  </>,
                  cash(j.revenue),
                  cash(j.cost),
                  cash(j.profit),
                  <span
                    key="margin"
                    className={
                      j.margin === null || j.margin < target ? 'risk' : 'good'
                    }
                  >
                    {pct(j.margin)}
                  </span>,
                  cash(j.shortfall),
                  track(`Review job ${j.id}: ${j.name}`),
                ])}
              />
            </section>
          </TabsContent>
          <TabsContent value="debtors">
            <section className="panel">
              <h2>Debtor ageing & risk</h2>
              <p className="muted">
                Ageing uses the invoice due date. High means more than 60 days
                overdue; it is a follow-up priority, not a credit score.
              </p>
              <Grid
                key={dataVersion}
                headers={[
                  'Customer',
                  'Due date',
                  'Outstanding',
                  'Days overdue',
                  'Age bucket',
                  'Priority',
                  'Action',
                ]}
                rows={result.debtors.map((d) => [
                  <>
                    <b>{d.customer}</b>
                    <small>{d.id}</small>
                  </>,
                  d.dueDate,
                  cash(d.outstanding),
                  d.days,
                  d.bucket,
                  <span key="risk" className={d.risk === 'High' ? 'risk' : ''}>
                    {d.risk}
                  </span>,
                  track(`Follow up debtor ${d.id}: ${d.customer}`),
                ])}
              />
            </section>
          </TabsContent>
          <TabsContent value="payments">
            <section className="panel">
              <h2>Potential duplicate supplier payments</h2>
              <p className="muted">
                Same supplier ID, normalised invoice reference and amount. Only
                the extra payment value is shown. Check credits, instalments and
                source evidence before acting.
              </p>
              {result.coverage.payments > 0 &&
              result.duplicates.length === 0 ? (
                <p>
                  No matching duplicates in {result.coverage.payments} loaded
                  payments. This does not rule out other payment errors.
                </p>
              ) : (
                <Grid
                  key={dataVersion}
                  headers={[
                    'Supplier',
                    'Invoice',
                    'Payments',
                    'Extra value',
                    'Source IDs',
                    'Action',
                  ]}
                  rows={result.duplicates.map((d) => [
                    d.supplier,
                    d.invoice,
                    d.count,
                    cash(d.amount),
                    d.paymentIds.join(', '),
                    track(`Investigate payments ${d.paymentIds.join(', ')}`),
                  ])}
                />
              )}
            </section>
          </TabsContent>
          <TabsContent value="labour">
            <section className="panel">
              <h2>Labour variance</h2>
              <p className="muted">
                Claimed less approved hours, valued at the supplied rate. A
                positive variance requires reconciliation, not an automatic
                deduction.
              </p>
              <Grid
                key={dataVersion}
                headers={[
                  'Crew / person',
                  'Job',
                  'Claimed',
                  'Approved',
                  'Variance',
                  'Review value',
                  'Action',
                ]}
                rows={result.labour.map((l) => [
                  l.person,
                  l.jobId,
                  l.claimedHours,
                  l.approvedHours,
                  `${l.varianceHours.toFixed(2)} h`,
                  cash(l.exposure),
                  track(`Reconcile labour ${l.id}: ${l.person}`),
                ])}
              />
            </section>
          </TabsContent>
          <TabsContent value="health">
            <section className="panel">
              <h2>Financial-control health</h2>
              <p className="muted">
                Answer against current evidence. Unknown controls are excluded
                from the score and remain unassessed. This checklist is not an
                audit opinion.
              </p>
              <p className="health-total">
                {health.score === null
                  ? 'Unassessed'
                  : `${health.score}% of answered controls met`}{' '}
                · {health.answered}/{health.total} answered
              </p>
              {controls.map((c, i) => (
                <div className="control-row" key={c}>
                  <span>
                    {i + 1}. {c}
                  </span>
                  <Choice
                    label={c}
                    value={answers[i] ?? 'unknown'}
                    onChange={(v) => setAnswers((a) => ({ ...a, [i]: v }))}
                    items={['unknown', 'yes', 'no']}
                  />
                  {answers[i] === 'no' && track(`Improve control: ${c}`)}
                </div>
              ))}
            </section>
          </TabsContent>
          <TabsContent value="actions">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Action tracking</h2>
                  <p className="muted">
                    Session only. Download your action record before closing or
                    refreshing.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      JSON.stringify({ currency, asOf, actions }, null, 2),
                      'profitleaklab-actions.json',
                    )
                  }
                >
                  <Download size={14} /> Download actions
                </Button>
              </div>
              <form
                className="action-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  addAction(title);
                }}
              >
                <Input
                  aria-label="New action"
                  placeholder="What needs to happen?"
                  value={title}
                  maxLength={200}
                  required
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Button type="submit">Add action</Button>
              </form>
              {!actions.length && (
                <p>
                  No actions yet. Track an exception from any control or add one
                  above.
                </p>
              )}
              {actions.map((a) => (
                <article className="action-card" key={a.id}>
                  <h3>{a.title}</h3>
                  <div className="action-fields">
                    <label>
                      Owner
                      <Input
                        value={a.owner}
                        maxLength={100}
                        onChange={(e) =>
                          updateAction(a.id, { owner: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Due date
                      <Input
                        type="date"
                        value={a.due}
                        onChange={(e) =>
                          updateAction(a.id, { due: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Status
                      <Choice
                        label={`Status for ${a.title}`}
                        value={a.status}
                        onChange={(v) => updateAction(a.id, { status: v })}
                        items={[
                          'Open',
                          'Investigating',
                          'Resolved',
                          'Dismissed',
                        ]}
                      />
                    </label>
                    <label>
                      Evidence / outcome
                      <Input
                        value={a.note}
                        maxLength={1000}
                        onChange={(e) =>
                          updateAction(a.id, { note: e.target.value })
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
            </section>
          </TabsContent>
          <TabsContent value="import">
            <section className="panel import-panel">
              <p className="eyebrow">BRING YOUR OWN EXPORTS</p>
              <h2>Turn records into a review list.</h2>
              <p>
                CSV files are processed in this browser tab. Records and actions
                are not sent to a server or saved after refresh.
              </p>
              <div className="import-controls">
                <label>
                  Record type
                  <Choice
                    label="Import record type"
                    value={section}
                    onChange={(value) => {
                      cancelImport();
                      setSection(value);
                    }}
                    items={sections}
                  />
                </label>
                <Button
                  variant="outline"
                  onClick={() =>
                    download(template(section), `${section}-template.csv`)
                  }
                >
                  <Download size={16} /> Download template
                </Button>
                <label className="file-label">
                  Choose CSV
                  <Input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    disabled={busy}
                    onChange={(e) => void importFile(e.target.files?.[0])}
                  />
                </label>
              </div>
              {busy && (
                <Button variant="outline" onClick={cancelImport}>
                  Cancel file read
                </Button>
              )}
              {preview && (
                <section className="import-preview" aria-label="CSV preview">
                  <h3>
                    Review {preview.rows.length} {preview.section} records
                  </h3>
                  <p>
                    {mode === 'Demo'
                      ? 'Applying this file removes all fictional demo records, demo actions and checklist answers.'
                      : `Applying this file replaces the ${data[preview.section]?.length ?? 0} current ${preview.section} records. Other sections and your action list stay in place.`}
                  </p>
                  <p className="muted">
                    Currency: {currency}. Review date: {asOf}. Confirm these
                    match your export; no currency conversion is performed.
                  </p>
                  {preview.rows.length === 0 ? (
                    <p className="risk">
                      This file has headers only. Applying it clears this
                      section.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(preview.rows[0]).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.rows.slice(0, 5).map((row, index) => (
                            <TableRow key={index}>
                              {Object.entries(row).map(([key, value]) => (
                                <TableCell key={key}>{value}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <p className="muted">
                        Showing the first {Math.min(5, preview.rows.length)}{' '}
                        records. All records passed file validation.
                      </p>
                    </div>
                  )}
                  <div className="import-actions">
                    <Button onClick={applyImport}>
                      {preview.rows.length === 0
                        ? 'Apply empty file and clear section'
                        : 'Apply reviewed import'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        cancelImport();
                        setMessage(
                          'Import cancelled. Current records retained.',
                        );
                      }}
                    >
                      Cancel import
                    </Button>
                  </div>
                </section>
              )}
              <ul>
                <li>
                  Use the exact template headers, one currency and tax-exclusive
                  job amounts.
                </li>
                <li>
                  Amounts: decimal numbers without currency symbols or thousands
                  separators. No negatives or more than two decimal places.
                </li>
                <li>
                  Dates: YYYY-MM-DD. IDs must be unique within each file.
                  Supplier IDs must identify the same legal supplier
                  consistently.
                </li>
                <li>
                  Each import replaces that section. Maximum 2 MB and 10,000
                  records per file.
                </li>
                <li>
                  Partial datasets produce partial results. Missing sections are
                  shown as not assessed.
                </li>
              </ul>
              <div className="import-actions">
                <Button
                  variant="outline"
                  onClick={() => {
                    cancelImport();
                    setData(empty);
                    setDataVersion((v) => v + 1);
                    setActions([]);
                    setAnswers({});
                    setMode('Private session');
                    setMessage('Session data and actions cleared.');
                  }}
                >
                  Clear session
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    cancelImport();
                    setData(demo);
                    setDataVersion((v) => v + 1);
                    setActions([]);
                    setAnswers({});
                    setAsOf(demoDate);
                    setMode('Demo');
                    setMessage(
                      'Fictional demo restored; session actions cleared.',
                    );
                  }}
                >
                  Restore fictional demo
                </Button>
              </div>
            </section>
          </TabsContent>
        </Tabs>
        <footer>
          ProfitLeakLab · Trade Financial Control{' '}
          <span>Review signals, verify source records, then act.</span>
        </footer>
      </main>
    </div>
  );
}
