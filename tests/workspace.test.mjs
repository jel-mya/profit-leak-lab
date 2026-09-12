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

test('expired or denied access during reads and onboarding clears identity and memberships', async () => {
  for (const code of ['42501', 'PGRST301', 'PGRST302']) {
    for (const operation of ['read', 'onboard']) {
      const { workspace } = setup({
        actions: async () => { throw fail(code); },
        createBusiness: async () => { throw fail(code); },
      });
      await workspace.connect();
      await assert.rejects(operation === 'read' ? workspace.selectBusiness('a') : workspace.onboard('Synthetic', 'AUD'));
      const state = workspace.snapshot();
      assert.equal(state.phase, 'signedOut');
      assert.equal(state.error, 'ACCESS_LOST');
      assert.equal(state.userId, null);
      assert.deepEqual(state.memberships, []);
      assert.deepEqual(state.actions, []);
      assert.equal(state.businessId, null);
      assert.equal(state.offset, 0);
    }
  }
});
test('network failure during a page load clears records but permits explicit business retry', async () => {
  let failing = false;
  const { workspace } = setup({ actions: async () => {
    if (failing) throw fail('NETWORK');
    return { rows: [record], hasMore: true };
  }});
  await ready(workspace);
  await workspace.selectBusiness('a', 100);
  failing = true;
  await assert.rejects(workspace.selectBusiness('a', 200));
  const state = workspace.snapshot();
  assert.equal(state.phase, 'chooseBusiness');
  assert.equal(state.userId, user.id);
  assert.deepEqual(state.actions, []);
  assert.equal(state.offset, 0);
  assert.equal(state.hasMore, false);
  failing = false;
  await workspace.selectBusiness('a');
  assert.equal(workspace.snapshot().phase, 'ready');
});
test('foreign write responses invalidate all cached access rather than retaining old actions', async () => {
  for (const operation of ['save', 'create']) {
    const { workspace } = setup({
      saveAction: async () => ({ ...record, business_id: 'foreign' }),
      createAction: async () => ({ ...record, business_id: 'foreign' }),
    });
    await ready(workspace);
    await assert.rejects(operation === 'save' ? workspace.save(record.id, draft) : workspace.create(draft), e => e.code === 'INVALID_RESPONSE');
    assert.equal(workspace.snapshot().phase, 'signedOut');
    assert.deepEqual(workspace.snapshot().actions, []);
    assert.deepEqual(workspace.snapshot().memberships, []);
  }
});
test('late denied read cannot clear a newer authorised business selection', async () => {
  let rejectRead;
  const pending = new Promise((resolve, reject) => { rejectRead = reject; });
  const { workspace } = setup({ actions: id => id === 'a' ? pending : Promise.resolve({ rows: [], hasMore: false }) });
  await workspace.connect();
  const reading = workspace.selectBusiness('a');
  await workspace.selectBusiness('b');
  rejectRead(fail('PGRST301'));
  await assert.rejects(reading);
  assert.equal(workspace.snapshot().phase, 'ready');
  assert.equal(workspace.snapshot().businessId, 'b');
});

const historyEvent = { id: 1, business_id: 'a', action_id: record.id, revision: 1, event_type: 'created', actor_id: user.id, recorded_at: '2026-09-01T00:00:00Z', before_state: null, after_state: draft };
test('history is available to a viewer but only for a loaded action', async () => {
  const calls = [];
  const { workspace } = setup({ memberships: async () => [{ business_id: 'a', role: 'viewer' }], history: async (...args) => { calls.push(args); return { rows: [historyEvent], hasMore: false }; } });
  await ready(workspace);
  await assert.rejects(workspace.loadHistory('foreign'), e => e.code === 'ACTION_NOT_LOADED');
  await workspace.loadHistory(record.id);
  assert.deepEqual(calls, [['a', record.id, null]]);
  assert.equal(workspace.snapshot().history.rows[0].revision, 1);
  workspace.closeHistory();
  assert.equal(workspace.snapshot().history, null);
});
test('sign-out and business switches discard pending history responses', async () => {
  for (const transition of ['signout', 'switch']) {
    const pending = deferred();
    const { workspace } = setup({ history: () => pending.promise });
    await ready(workspace);
    const reading = workspace.loadHistory(record.id);
    if (transition === 'signout') workspace.disconnect();
    else await workspace.selectBusiness('b');
    pending.resolve({ rows: [historyEvent], hasMore: false });
    await assert.rejects(reading, e => e.code === 'STALE_REQUEST');
    assert.equal(workspace.snapshot().history, null);
  }
});
test('foreign history responses clear cached access and cannot display another tenant event', async () => {
  const { workspace } = setup({ history: async () => ({ rows: [{ ...historyEvent, business_id: 'foreign' }], hasMore: false }) });
  await ready(workspace);
  await assert.rejects(workspace.loadHistory(record.id), e => e.code === 'INVALID_RESPONSE');
  assert.equal(workspace.snapshot().phase, 'signedOut');
  assert.equal(workspace.snapshot().history, null);
});
test('saving invalidates old history and a late history response cannot undo the save', async () => {
  const pending = deferred();
  const { workspace } = setup({ history: () => pending.promise });
  await ready(workspace);
  const reading = workspace.loadHistory(record.id);
  await workspace.save(record.id, { ...draft, note: 'Synthetic evidence' });
  pending.resolve({ rows: [historyEvent], hasMore: false });
  await assert.rejects(reading, e => e.code === 'STALE_REQUEST');
  assert.equal(workspace.snapshot().history, null);
  assert.equal(workspace.snapshot().actions[0].revision, 2);
});
test('history adapter filters tenant and action, orders revisions and uses a bounded cursor', async () => {
  const calls = [];
  const builder = { then(resolve) { return Promise.resolve({ data: Array.from({ length: 51 }, () => historyEvent), error: null }).then(resolve); } };
  for (const method of ['select', 'eq', 'order', 'lt', 'limit']) builder[method] = (...args) => { calls.push([method, ...args]); return builder; };
  const port = createSupabasePort({ from: table => { calls.push(['from', table]); return builder; } });
  const page = await port.history('a', record.id, '9007199254740993');
  assert.equal(page.rows.length, 50);
  assert.equal(page.hasMore, true);
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'business_id' && c[2] === 'a'));
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'action_id' && c[2] === record.id));
  assert.ok(calls.some(c => c[0] === 'lt' && c[2] === '9007199254740993'));
  assert.ok(calls.some(c => c[0] === 'limit' && c[1] === 51));
  assert.ok(calls.some(c => c[0] === 'order' && c[1] === 'revision' && c[2].ascending === false));
  await assert.rejects(port.history('a', record.id, -1), e => e.code === 'INVALID_PAGE');
});

test('blank closure outcomes are rejected before any workspace write', async () => {
  const { workspace, calls } = setup(); await ready(workspace);
  for (const status of ['Resolved', 'Dismissed']) {
    await assert.rejects(workspace.save(record.id, { ...draft, status, note: ' \t' }), e => e.code === 'OUTCOME_REQUIRED');
  }
  assert.equal(calls.length, 0);
  assert.equal(workspace.snapshot().phase, 'ready');
  await workspace.save(record.id, { ...draft, status: 'Resolved', note: 'Synthetic outcome recorded.' });
  assert.equal(workspace.snapshot().actions[0].status, 'Resolved');
});

test('uncertain creation retries reuse the original request key and clear it on success', async () => {
  const calls = [];
  const { workspace } = setup({ createAction: async (businessId, values, requestId) => {
    calls.push({ businessId, values, requestId });
    if (calls.length === 1) throw fail('NETWORK');
    return record;
  }});
  await ready(workspace);
  await assert.rejects(workspace.create(draft));
  assert.equal(workspace.snapshot().error, 'CREATE_UNCERTAIN');
  const original = workspace.snapshot().creation;
  await workspace.selectBusiness('a');
  assert.equal(workspace.snapshot().creation.requestId, original.requestId);
  await workspace.create(draft);
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert.match(calls[0].requestId, /^[0-9a-f-]{36}$/);
  assert.equal(workspace.snapshot().creation, null);
});
test('changed uncertain drafts cannot create another action without explicit abandonment', async () => {
  const keys = [];
  const { workspace } = setup({ createAction: async (id, values, key) => { keys.push(key); throw fail('NETWORK'); } });
  await ready(workspace);
  await assert.rejects(workspace.create(draft));
  await assert.rejects(workspace.create({ ...draft, title: 'Different' }), e => e.code === 'CREATE_REVIEW_REQUIRED');
  assert.equal(keys.length, 1);
  workspace.abandonCreation();
  await assert.rejects(workspace.create({ ...draft, title: 'Different' }));
  assert.notEqual(keys[0], keys[1]);
});
test('definite validation failures release the creation key while sign-out clears uncertain state', async () => {
  const { workspace } = setup({ createAction: async () => { throw fail('23514'); } });
  await ready(workspace);
  await assert.rejects(workspace.create(draft));
  assert.equal(workspace.snapshot().creation, null);
  const pending = setup({ createAction: async () => { throw fail('NETWORK'); } }).workspace;
  await ready(pending); await assert.rejects(pending.create(draft));
  pending.disconnect();
  assert.equal(pending.snapshot().creation, null);
  assert.equal(pending.snapshot().actions.length, 0);
});
test('creation adapter uses the retry RPC and forwards only the editable payload', async () => {
  let captured;
  const port = createSupabasePort({ rpc: (name, args) => { captured = { name, args }; return { single: async () => ({ data: record, error: null }) }; } });
  await port.createAction('a', { ...draft, created_by: 'spoof', revision: 77 }, 'synthetic-key');
  assert.equal(captured.name, 'create_control_action');
  assert.deepEqual(captured.args, { p_request_id: 'synthetic-key', p_business_id: 'a', p_title: draft.title, p_owner_label: '', p_due_date: null, p_status: 'Open', p_note: '' });
});

test('malformed action and history responses clear cached workspace access', async () => {
  for (const result of [null, {}, { rows: null }, { rows: [null], hasMore: false }]) {
    const { workspace } = setup({ actions: async () => result });
    await workspace.connect();
    await assert.rejects(workspace.selectBusiness('a'), e => e.code === 'INVALID_RESPONSE');
    assert.equal(workspace.snapshot().userId, null);
  }
  for (const result of [null, {}, { rows: null }, { rows: [null], hasMore: false }]) {
    const { workspace } = setup({ history: async () => result }); await ready(workspace);
    await assert.rejects(workspace.loadHistory(record.id), e => e.code === 'INVALID_RESPONSE');
    assert.deepEqual(workspace.snapshot().actions, []);
  }
});
test('empty save and creation responses cannot retain stale financial state', async () => {
  for (const operation of ['save', 'create']) {
    const { workspace } = setup({ saveAction: async () => null, createAction: async () => null });
    await ready(workspace);
    await assert.rejects(operation === 'save' ? workspace.save(record.id, draft) : workspace.create(draft), e => e.code === 'INVALID_RESPONSE');
    assert.equal(workspace.snapshot().phase, 'signedOut');
    assert.deepEqual(workspace.snapshot().actions, []);
  }
});

test('adapter classifies empty successful responses as invalid rather than network failures', async () => {
  const port = createSupabasePort({ auth: { getUser: async () => ({ data: null, error: null }) } });
  await assert.rejects(port.verifyUser(), e => e.code === 'INVALID_RESPONSE');
});

test('invalid membership payloads fail closed before publishing business access', async () => {
  for (const memberships of [null, {}, [null], [{business_id: '', role: 'owner'}], [{business_id: 'a', role: 'admin'}], [{business_id: 'a', role: 'viewer'}, {business_id: 'a', role: 'owner'}]]) {
    const { workspace } = setup({ memberships: async () => memberships });
    await assert.rejects(workspace.connect(), e => e.code === 'INVALID_RESPONSE');
    assert.equal(workspace.snapshot().phase, 'signedOut');
    assert.equal(workspace.snapshot().userId, null);
    assert.deepEqual(workspace.snapshot().memberships, []);
    await assert.rejects(workspace.selectBusiness('a'), e => e.code === 'ACCESS_DENIED');
  }
  const { workspace } = setup({ memberships: async () => [] });
  await workspace.connect();
  assert.equal(workspace.snapshot().phase, 'chooseBusiness');
});

test('recovery adapter forwards only recovery fields and the expected revision', async () => {
  let call;
  const port = createSupabasePort({rpc(name, args) { call = {name, args}; return {single: async () => ({data: record, error: null})}; }});
  await port.recordRecovery('action-a', 3, {amountMinorUnits: 1230, currency: 'AUD', date: '2026-09-12', evidence: 'Synthetic receipt', status: 'Resolved', business_id: 'foreign', created_by: 'spoof'});
  assert.deepEqual(call, {name: 'record_action_recovery', args: {p_action_id: 'action-a', p_expected_revision: 3, p_amount: 1230, p_currency: 'AUD', p_date: '2026-09-12', p_evidence: 'Synthetic receipt'}});
});
test('recovery adapter preserves conflict codes while excluding server error details', async () => {
  const port = createSupabasePort({rpc() { return {single: async () => ({data: null, error: {code: 'PT409', message: 'private payload'}})}; }});
  await assert.rejects(port.recordRecovery('action-a', 1, {}), error => error.code === 'PT409' && error.message === 'PT409');
});

const recoveryInput = { amountMinorUnits: 1230, currency: 'AUD', date: '2026-09-12', evidence: 'Synthetic receipt' };
const recoveryMemberships = async () => [{business_id: 'a', role: 'editor', businesses: {currency: 'AUD'}}];
test('recovery coordinator serialises writes and uses the loaded revision with isolated input', async () => {
  const pending = deferred(); let payload;
  const {workspace} = setup({memberships: recoveryMemberships, recordRecovery: (id, revision, input) => {payload = {id, revision, input}; return pending.promise;}});
  await ready(workspace);
  const saving = workspace.recordRecovery('action-a', {...recoveryInput, status: 'Resolved'});
  await assert.rejects(workspace.save('action-a', draft), e => e.code === 'NOT_READY');
  assert.deepEqual(payload, {id: 'action-a', revision: 1, input: recoveryInput});
  pending.resolve({...record, revision: 2, recovery_amount: 1230});
  await saving;
  assert.equal(workspace.snapshot().actions[0].revision, 2);
  assert.equal(workspace.snapshot().actions[0].status, 'Open');
});
test('recovery validation and role checks stop invalid writes before the port', async () => {
  let calls = 0;
  const {workspace} = setup({memberships: recoveryMemberships, recordRecovery: async () => {calls++;}});
  await ready(workspace);
  for (const patch of [{amountMinorUnits: -1}, {amountMinorUnits: 0.5}, {amountMinorUnits: 100000000001}, {date: '2026-02-30'}, {evidence: '\u00a0'}, {currency: 'USD'}]) {
    await assert.rejects(workspace.recordRecovery('action-a', {...recoveryInput, ...patch}));
  }
  await assert.rejects(workspace.recordRecovery('foreign', recoveryInput), e => e.code === 'ACTION_NOT_LOADED');
  const viewer = setup({recordRecovery: async () => {calls++;}}).workspace;
  await viewer.connect(); await viewer.selectBusiness('b');
  await assert.rejects(viewer.recordRecovery('action-a', recoveryInput), e => e.code === 'ACCESS_DENIED');
  assert.equal(calls, 0);
});
test('conflict and uncertain recovery require a fresh read and acknowledgement without automatic replay', async () => {
  for (const failure of ['PT409', 'NETWORK']) {
    let calls = 0;
    const {workspace} = setup({memberships: recoveryMemberships, recordRecovery: async () => {calls++; throw fail(failure);}});
    await ready(workspace);
    await assert.rejects(workspace.recordRecovery('action-a', recoveryInput));
    assert.equal(workspace.snapshot().phase, 'recoveryReview');
    assert.deepEqual(workspace.snapshot().recoveryReview.input, recoveryInput);
    assert.throws(() => workspace.finishRecoveryReview(), e => e.code === 'RELOAD_REQUIRED');
    await assert.rejects(workspace.recordRecovery('action-a', recoveryInput), e => e.code === 'NOT_READY');
    await workspace.reloadRecoveryReview();
    assert.equal(workspace.snapshot().phase, 'recoveryReview');
    workspace.finishRecoveryReview();
    assert.equal(workspace.snapshot().actions[0].revision, 2);
    assert.equal(workspace.snapshot().recoveryReview, null);
    assert.equal(calls, 1);
  }
});
test('recovery completion after disconnect cannot restore tenant data', async () => {
  const pending = deferred();
  const {workspace} = setup({memberships: recoveryMemberships, recordRecovery: () => pending.promise});
  await ready(workspace);
  const saving = workspace.recordRecovery('action-a', recoveryInput);
  workspace.disconnect(); pending.resolve({...record, revision: 2});
  await assert.rejects(saving, e => e.code === 'STALE_REQUEST');
  assert.equal(workspace.snapshot().phase, 'signedOut');
  assert.deepEqual(workspace.snapshot().actions, []);
});
test('recovery access loss and foreign responses clear cached access', async () => {
  for (const result of [async () => {throw fail('42501');}, async () => ({...record, business_id: 'foreign'}), async () => null]) {
    const {workspace} = setup({memberships: recoveryMemberships, recordRecovery: result});
    await ready(workspace);
    await assert.rejects(workspace.recordRecovery('action-a', recoveryInput));
    assert.equal(workspace.snapshot().phase, 'signedOut');
    assert.equal(workspace.snapshot().recoveryReview, null);
  }
});
test('failed recovery reload invalidates a previously fetched revision before acknowledgement', async () => {
  let reads = 0;
  const {workspace} = setup({memberships: recoveryMemberships, recordRecovery: async () => {throw fail('PT409');}, action: async () => {if (reads++) throw fail('NETWORK'); return {...record, revision: 2};}});
  await ready(workspace);
  await assert.rejects(workspace.recordRecovery('action-a', recoveryInput));
  await workspace.reloadRecoveryReview();
  await assert.rejects(workspace.reloadRecoveryReview());
  assert.throws(() => workspace.finishRecoveryReview(), e => e.code === 'RELOAD_REQUIRED');
  assert.deepEqual(workspace.snapshot().recoveryReview.input, recoveryInput);
});
