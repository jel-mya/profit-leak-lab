import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace } from '../core/workspace.mjs';
import { createSupabasePort } from '../core/supabase-port.mjs';
const draft = { title: 'Synthetic review', owner_label: '', due_date: null, status: 'Open', note: '' };
const record = { ...draft, id: 'action-a', business_id: 'a', revision: 1 };
const user = { id: 'synthetic-user', email_confirmed_at: '2026-09-01', is_anonymous: false };
const fail = code => Object.assign(new Error('private server detail'), { code });
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function setup(overrides = {}) {
  const calls = [];
  const port = {
    verifyUser: async () => user,
    memberships: async () => [{ business_id: 'a', role: 'editor' }, { business_id: 'b', role: 'viewer' }],
    actions: async id => ({ rows: id === 'a' ? [structuredClone(record)] : [], hasMore: false }),
    action: async () => ({ ...record, revision: 2, title: 'Other editor' }),
    saveAction: async (id, revision, values) => { calls.push({ id, revision, values }); return { ...record, ...values, revision: revision + 1 }; },
    ...overrides,
  };
  return { workspace: createWorkspace(port), calls };
}
async function ready(workspace) { await workspace.connect(); await workspace.selectBusiness('a'); }
test('verified session loads only an explicitly selected membership', async () => {
  const { workspace } = setup();
  await workspace.connect();
  assert.equal(workspace.snapshot().phase, 'chooseBusiness');
  assert.equal(workspace.snapshot().actions.length, 0);
  await assert.rejects(workspace.selectBusiness('foreign'), e => e.code === 'ACCESS_DENIED');
  await workspace.selectBusiness('a');
  assert.equal(workspace.snapshot().actions[0].business_id, 'a');
});
test('anonymous, unverified and absent users fail closed', async () => {
  for (const identity of [null, { ...user, is_anonymous: true }, { ...user, email_confirmed_at: null }]) {
    const { workspace } = setup({ verifyUser: async () => identity });
    await assert.rejects(workspace.connect(), e => e.code === 'VERIFIED_SIGN_IN_REQUIRED');
    assert.equal(workspace.snapshot().userId, null);
  }
});
test('sign-out invalidates a late Auth response', async () => {
  const pending = deferred();
  const { workspace } = setup({ verifyUser: () => pending.promise });
  const connecting = workspace.connect(); workspace.disconnect(); pending.resolve(user);
  await assert.rejects(connecting, e => e.code === 'STALE_REQUEST');
  assert.equal(workspace.snapshot().phase, 'signedOut');
});
test('business switches discard late records from the previous tenant', async () => {
  const pending = deferred();
  const { workspace } = setup({ actions: id => id === 'a' ? pending.promise : Promise.resolve({ rows: [], hasMore: false }) });
  await workspace.connect();
  const loading = workspace.selectBusiness('a'); await workspace.selectBusiness('b');
  pending.resolve({ rows: [record], hasMore: false });
  await assert.rejects(loading, e => e.code === 'STALE_REQUEST');
  assert.equal(workspace.snapshot().businessId, 'b');
  assert.deepEqual(workspace.snapshot().actions, []);
});
test('foreign records in a response are rejected and cleared', async () => {
  const { workspace } = setup({ actions: async () => ({ rows: [{ ...record, business_id: 'foreign' }], hasMore: false }) });
  await workspace.connect();
  await assert.rejects(workspace.selectBusiness('a'), e => e.code === 'INVALID_RESPONSE');
  assert.equal(workspace.snapshot().businessId, null);
});
test('save forwards only editable fields and the loaded revision', async () => {
  const { workspace, calls } = setup(); await ready(workspace);
  await workspace.save(record.id, { ...draft, business_id: 'foreign', revision: 999, created_by: 'spoof' });
  assert.deepEqual(calls, [{ id: record.id, revision: 1, values: draft }]);
  assert.equal(workspace.snapshot().actions[0].revision, 2);
});
test('invalid dates and viewer saves never reach persistence', async () => {
  const { workspace, calls } = setup(); await ready(workspace);
  await assert.rejects(workspace.save(record.id, { ...draft, due_date: '2026-02-30' }), e => e.code === 'INVALID_DRAFT');
  await workspace.selectBusiness('b');
  await assert.rejects(workspace.save(record.id, draft), e => e.code === 'ACCESS_DENIED');
  assert.equal(calls.length, 0);
});
test('conflicts preserve drafts until explicit reload and reconciliation', async () => {
  const calls = [];
  const { workspace } = setup({ saveAction: async (id, revision, values) => {
    calls.push({ revision, values });
    if (revision === 1) throw fail('PT409');
    return { ...record, ...values, revision: 3 };
  } });
  await ready(workspace);
  await assert.rejects(workspace.save(record.id, { ...draft, note: 'My draft' }), e => e.code === 'PT409');
  assert.equal(workspace.snapshot().conflict.draft.note, 'My draft');
  await assert.rejects(workspace.resolveConflict(draft), e => e.code === 'RELOAD_REQUIRED');
  await workspace.reloadConflict();
  assert.equal(calls.length, 1);
  assert.equal(workspace.snapshot().conflict.current.title, 'Other editor');
  await workspace.resolveConflict({ ...draft, note: 'Reconciled' });
  assert.equal(calls[1].revision, 2);
  assert.equal(workspace.snapshot().phase, 'ready');
});
test('access loss clears all cached financial state', async () => {
  const { workspace } = setup({ saveAction: async () => { throw fail('42501'); } });
  await ready(workspace);
  await assert.rejects(workspace.save(record.id, draft));
  assert.equal(workspace.snapshot().phase, 'signedOut');
  assert.deepEqual(workspace.snapshot().actions, []);
  assert.deepEqual(workspace.snapshot().memberships, []);
});
test('late save responses cannot restore state after disconnect', async () => {
  const pending = deferred(); const { workspace } = setup({ saveAction: () => pending.promise });
  await ready(workspace); const saving = workspace.save(record.id, draft); workspace.disconnect();
  pending.resolve({ ...record, revision: 2 });
  await assert.rejects(saving, e => e.code === 'STALE_REQUEST');
  assert.equal(workspace.snapshot().phase, 'signedOut');
});
test('snapshots cannot mutate internal state', async () => {
  const { workspace } = setup(); await ready(workspace);
  workspace.snapshot().actions[0].revision = 99;
  assert.equal(workspace.snapshot().actions[0].revision, 1);
});
test('Supabase adapter uses bounded tenant queries and revision RPC, not table updates', async () => {
  const calls = [];
  const builder = { then(resolve) { return Promise.resolve({ data: Array.from({ length: 101 }, () => record), error: null }).then(resolve); } };
  for (const method of ['select', 'eq', 'order', 'range', 'single']) builder[method] = (...args) => { calls.push([method, ...args]); return builder; };
  const client = { from: table => { calls.push(['from', table]); return builder; }, rpc: (name, args) => { calls.push(['rpc', name, args]); return builder; } };
  const port = createSupabasePort(client);
  const page = await port.actions('a');
  assert.equal(page.rows.length, 100); assert.equal(page.hasMore, true);
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'business_id' && c[2] === 'a'));
  assert.ok(calls.some(c => c[0] === 'range' && c[1] === 0 && c[2] === 100));
  await port.saveAction(record.id, 4, draft);
  assert.equal(calls.find(c => c[0] === 'rpc')[2].p_expected_revision, 4);
});
test('Supabase adapter verifies users through Auth and strips server error detail', async () => {
  const port = createSupabasePort({ auth: { getUser: async () => ({ data: { user }, error: null }) }, rpc: () => ({ single: async () => ({ data: null, error: { code: 'PT409', message: 'sensitive server details' } }) }) });
  assert.equal((await port.verifyUser()).id, user.id);
  await assert.rejects(port.createBusiness('Synthetic', 'AUD'), e => e.code === 'PT409' && !e.message.includes('sensitive'));
});
test('creation strips identity fields and ignores a late completion after sign-out', async () => {
  const pending = deferred(); let captured;
  const { workspace } = setup({ createAction: (businessId, values) => { captured = { businessId, values }; return pending.promise; } });
  await ready(workspace);
  const creating = workspace.create({ ...draft, created_by: 'spoofed', id: 'spoofed' });
  assert.deepEqual(captured, { businessId: 'a', values: draft });
  workspace.disconnect(); pending.resolve(record);
  await assert.rejects(creating, e => e.code === 'STALE_REQUEST');
  assert.equal(workspace.snapshot().phase, 'signedOut');
});
test('onboarding refreshes verified memberships and cannot revive a disconnected session', async () => {
  const pending = deferred(); const { workspace } = setup({ createBusiness: () => pending.promise });
  await workspace.connect(); const onboarding = workspace.onboard('Synthetic', 'AUD');
  workspace.disconnect(); pending.resolve({ id: 'new', name: 'Synthetic', currency: 'AUD' });
  await assert.rejects(onboarding, e => e.code === 'STALE_REQUEST');
  assert.equal(workspace.snapshot().userId, null);
});
test('page selection passes a validated offset and tracks continuation', async () => {
  let offset;
  const { workspace } = setup({ actions: async (id, page) => { offset = page; return { rows: [], hasMore: true }; } });
  await workspace.connect(); await workspace.selectBusiness('a', 100);
  assert.equal(offset, 100); assert.equal(workspace.snapshot().offset, 100);
  await assert.rejects(workspace.selectBusiness('a', -1), e => e.code === 'INVALID_PAGE');
});
test('network failure while reloading a conflict retains the draft', async () => {
  const { workspace } = setup({ saveAction: async () => { throw fail('PT409'); }, action: async () => { throw fail('NETWORK'); } });
  await ready(workspace); await assert.rejects(workspace.save(record.id, draft));
  await assert.rejects(workspace.reloadConflict());
  assert.equal(workspace.snapshot().phase, 'conflict');
  assert.deepEqual(workspace.snapshot().conflict.draft, draft);
});
