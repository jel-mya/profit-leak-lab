'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createWorkspace,
  type Action,
  type Draft,
  type State,
  type Workspace,
} from '../../../core/workspace.mjs';
import { createSupabasePort } from '../../../core/supabase-port.mjs';
import { workspaceConfig } from '../../../core/workspace-config.mjs';

const blank: Draft = {
  title: '',
  owner_label: '',
  due_date: null,
  status: 'Open',
  note: '',
};
const messages: Record<string, string> = {
  PT409: 'This record changed. Review the current version before saving again.',
  ACCESS_LOST:
    'Your access changed. Sign in again to refresh your memberships.',
  VERIFIED_SIGN_IN_REQUIRED:
    'Use a verified, non-anonymous account for this pilot.',
  INVALID_DRAFT: 'Check the action title, date and required fields.',
  ACCESS_DENIED: 'Your membership does not allow this action.',
};
function errorText(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  return code === 'STALE_REQUEST'
    ? ''
    : (messages[code] ??
        'The request could not be completed. Your draft has been retained; check your connection and access before trying again.');
}
function Choice({
  value,
  items,
  label,
  onChange,
}: {
  value: string;
  items: string[];
  label: string;
  onChange: (value: string) => void;
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
export default function CloudWorkspace() {
  const [runtime, setRuntime] = useState<{
    client: SupabaseClient;
    workspace: Workspace;
  } | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('AUD');
  const [draft, setDraft] = useState<Draft>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let cleanup = () => {};
    void (async () => {
      try {
        const response = await fetch('/api/workspace-config', {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Configuration unavailable');
        const payload = (await response.json()) as {
          config?: { url?: string; publishableKey?: string } | null;
        };
        const config = workspaceConfig({
          CLOUD_WORKSPACE_ENABLED: 'true',
          SUPABASE_URL: payload?.config?.url,
          SUPABASE_PUBLISHABLE_KEY: payload?.config?.publishableKey,
        });
        if (!alive) return;
        if (!config) {
          setAvailable(false);
          return;
        }
        const client = createClient(config.url, config.publishableKey, {
          auth: {
            persistSession: false,
            detectSessionInUrl: false,
            autoRefreshToken: true,
          },
        });
        const workspace = createWorkspace(createSupabasePort(client));
        const unsubscribe = workspace.subscribe((next) => {
          if (!alive) return;
          setState(next);
          if (!next.userId) {
            setDraft(blank);
            setEditing(null);
          }
        });
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((event, session) => {
          if (!alive) return;
          if (event === 'SIGNED_OUT') {
            workspace.disconnect();
            return;
          }
          if (
            event === 'SIGNED_IN' &&
            session &&
            workspace.snapshot().userId !== session.user.id
          ) {
            workspace.disconnect();
            setTimeout(() => {
              if (alive)
                void workspace.connect().catch((e) => {
                  if (alive) setMessage(errorText(e));
                });
            }, 0);
          }
        });
        cleanup = () => {
          unsubscribe();
          subscription.unsubscribe();
          workspace.disconnect();
          void client.auth.stopAutoRefresh();
        };
        setRuntime({ client, workspace });
        setState(workspace.snapshot());
        setAvailable(true);
      } catch {
        if (alive) {
          setAvailable(false);
          setMessage(
            'Cloud configuration could not be loaded. The session-only demo is still available.',
          );
        }
      }
    })();
    return () => {
      alive = false;
      cleanup();
    };
  }, []);
  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  function edit(action: Action) {
    setEditing(action.id);
    setDraft({
      title: action.title,
      owner_label: action.owner_label,
      due_date: action.due_date,
      status: action.status,
      note: action.note,
    });
  }
  const ws = runtime?.workspace;
  const role = state?.memberships.find(
    (m) => m.business_id === state.businessId,
  )?.role;
  const canEdit = ['owner', 'editor'].includes(role ?? '');
  return (
    <main className="cloud-workspace">
      <Link href="/" className="eyebrow">
        ← PROFITLEAKLAB DEMO
      </Link>
      <div className="heading-row">
        <div>
          <p className="eyebrow">CONNECTED WORKSPACE · PILOT</p>
          <h1>Your business actions.</h1>
          <p className="muted">
            Verified access, shared follow-up and a record of changes.
          </p>
        </div>
        {state?.userId && (
          <Button
            variant="outline"
            onClick={() =>
              void perform(async () => {
                ws?.disconnect();
                setDraft(blank);
                setEditing(null);
                const result = await runtime!.client.auth.signOut({
                  scope: 'local',
                });
                if (result.error) throw result.error;
              })
            }
          >
            Sign out
          </Button>
        )}
      </div>
      <output className="feedback" aria-live="polite">
        {message ||
          (state?.error
            ? (messages[state.error] ?? 'Check your access and try again.')
            : '')}
      </output>
      {available === null && <p>Checking workspace availability…</p>}
      {available === false && (
        <section className="panel">
          <h2>Cloud workspace is not connected yet.</h2>
          <p>
            The current preview keeps data in browser memory. Sign-in and shared
            actions will become available after the project connection and live
            security checks are complete.
          </p>
          <p className="muted">
            No account details or financial records are collected on this
            screen.
          </p>
          <Link href="/">Continue with the session-only demo →</Link>
        </section>
      )}
      {available && state?.phase === 'signedOut' && (
        <section className="panel">
          <h2>Sign in to the pilot</h2>
          <p className="muted">
            Use a verified account provisioned for the pilot. Your session stays
            in this tab; refreshing requires sign-in again.
          </p>
          <form
            className="cloud-form"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(async () => {
                const suppliedPassword = password;
                setPassword('');
                const { error } = await runtime!.client.auth.signInWithPassword(
                  { email, password: suppliedPassword },
                );
                if (error) {
                  setMessage(
                    'Sign-in failed. Check your email, password and verification status.',
                  );
                  return;
                }
              });
            }}
          >
            <label>
              Email
              <Input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={busy}>
              Sign in
            </Button>
          </form>
        </section>
      )}
      {available && state?.phase === 'loading' && (
        <p>Loading your authorised workspace…</p>
      )}
      {state?.phase === 'chooseBusiness' && (
        <section className="panel">
          <h2>Choose a business</h2>
          {state.memberships.map((m) => (
            <Button
              className="business-choice"
              key={m.business_id}
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setDraft(blank);
                void perform(() => ws!.selectBusiness(m.business_id));
              }}
            >
              {m.businesses?.name ?? 'Business'} · {m.role}
            </Button>
          ))}
          <h3>Create your starter business</h3>
          <p className="muted">
            This creates a new business with you as its owner. It does not join
            another business with a matching name.
          </p>
          <form
            className="cloud-form"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(() => ws!.onboard(businessName, currency));
            }}
          >
            <label>
              Business name
              <Input
                maxLength={200}
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
            <label>
              Currency
              <Choice
                value={currency}
                items={['AUD', 'USD', 'GBP', 'CAD', 'NZD']}
                label="Business currency"
                onChange={setCurrency}
              />
            </label>
            <Button disabled={busy} type="submit">
              Create starter business
            </Button>
          </form>
        </section>
      )}
      {state?.businessId &&
        ['ready', 'saving', 'conflict'].includes(state.phase) && (
          <>
            <div className="panel-heading">
              <p className="muted">
                Membership: {role}. Showing up to 100 actions per page.
              </p>
              <Button
                variant="outline"
                disabled={busy || state.phase !== 'ready'}
                onClick={() => {
                  setDraft(blank);
                  setEditing(null);
                  void perform(() => ws!.connect());
                }}
              >
                Switch business
              </Button>
            </div>
            <div className="panel-grid">
              <section className="panel">
                <h2>Saved actions</h2>
                {state.actions.length === 0 && (
                  <p>No actions on this page. Add your first follow-up.</p>
                )}
                {state.actions.map((a) => (
                  <article key={a.id} className="action-card">
                    <h3>{a.title}</h3>
                    <p className="muted">
                      {a.status} · {a.owner_label || 'Unassigned'} ·{' '}
                      {a.due_date || 'No due date'} · revision {a.revision}
                    </p>
                    <p>{a.note}</p>
                    {canEdit && (
                      <Button
                        variant="outline"
                        disabled={busy || state.phase !== 'ready'}
                        onClick={() => edit(a)}
                      >
                        Edit action
                      </Button>
                    )}
                  </article>
                ))}
                <div className="import-actions">
                  <Button
                    variant="outline"
                    disabled={
                      busy || state.phase !== 'ready' || state.offset === 0
                    }
                    onClick={() => {
                      setEditing(null);
                      setDraft(blank);
                      void perform(() =>
                        ws!.selectBusiness(
                          state.businessId!,
                          Math.max(0, state.offset - 100),
                        ),
                      );
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || state.phase !== 'ready' || !state.hasMore}
                    onClick={() => {
                      setEditing(null);
                      setDraft(blank);
                      void perform(() =>
                        ws!.selectBusiness(
                          state.businessId!,
                          state.offset + 100,
                        ),
                      );
                    }}
                  >
                    Next
                  </Button>
                </div>
              </section>
              {canEdit && (
                <section className="panel">
                  <h2>{editing ? 'Edit action' : 'New action'}</h2>
                  {state.phase === 'conflict' && (
                    <div className="demo-banner">
                      <span>
                        Your draft is retained below. Load the current version,
                        compare it, then explicitly save a reconciled version.
                      </span>
                    </div>
                  )}
                  {state.conflict && (
                    <div className="conflict-review">
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => void perform(() => ws!.reloadConflict())}
                      >
                        Load current version
                      </Button>
                      {state.conflict.current && (
                        <>
                          <h3>Current saved version</h3>
                          <p>{state.conflict.current.title}</p>
                          <p>
                            {state.conflict.current.owner_label || 'Unassigned'}{' '}
                            · {state.conflict.current.due_date || 'No date'} ·{' '}
                            {state.conflict.current.status}
                          </p>
                          <p>
                            {state.conflict.current.note || 'No evidence note'}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <form
                    className="cloud-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void perform(async () => {
                        if (state.phase === 'conflict')
                          await ws!.resolveConflict(draft);
                        else if (editing) await ws!.save(editing, draft);
                        else {
                          await ws!.create(draft);
                          await ws!.selectBusiness(state.businessId!);
                        }
                        setEditing(null);
                        setDraft(blank);
                        setMessage('Action saved.');
                      });
                    }}
                  >
                    <label>
                      Action
                      <Input
                        required
                        maxLength={200}
                        value={draft.title}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, title: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Owner
                      <Input
                        maxLength={100}
                        value={draft.owner_label}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            owner_label: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Due date
                      <Input
                        type="date"
                        value={draft.due_date ?? ''}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            due_date: e.target.value || null,
                          }))
                        }
                      />
                    </label>
                    <label>
                      Status
                      <Choice
                        value={draft.status}
                        label="Action status"
                        items={[
                          'Open',
                          'Investigating',
                          'Resolved',
                          'Dismissed',
                        ]}
                        onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
                      />
                    </label>
                    <label>
                      Evidence / outcome
                      <Input
                        maxLength={1000}
                        value={draft.note}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, note: e.target.value }))
                        }
                      />
                    </label>
                    <Button
                      type="submit"
                      disabled={
                        busy ||
                        state.phase === 'saving' ||
                        (state.phase === 'conflict' && !state.conflict?.current)
                      }
                    >
                      {state.phase === 'conflict'
                        ? 'Save reconciled version'
                        : 'Save action'}
                    </Button>
                  </form>
                </section>
              )}
            </div>
          </>
        )}
      <footer>
        ProfitLeakLab · Connected pilot{' '}
        <span>Financial imports remain in the session-only demo.</span>
      </footer>
    </main>
  );
}
