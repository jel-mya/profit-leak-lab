import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyWriteIsolation } from '../integration/supabase-write-checks.mjs';
function setup(fault) {
  let record, payload, creates = 0;
  const events = [];
  const owner = {
    rpc(name, args) { return { single: async () => {
      if (name === 'create_control_action') {
        creates++;
        if (payload && JSON.stringify(payload) !== JSON.stringify(args)) return { error: { code: 'PT409' } };
        if (!record) {
          payload = structuredClone(args);
          record = { id: 'synthetic-action', business_id: args.p_business_id, revision: 1, status: 'Open', note: '' };
          events.push({ revision: 1, event_type: 'created', before_state: null, after_state: structuredClone(record) });
        }
        const data = structuredClone(record);
        if (fault === 'duplicate' && creates === 2) data.id = 'duplicate';
        if (fault === 'replay' && record.revision === 2) data.note = 'overwritten';
        if (fault === 'replay-identity' && record.revision === 2) data.id = 'wrong-action';
        return { data, error: null };
      }
      if (record.revision !== args.p_expected_revision && fault !== 'two-winners') return { error: { code: 'PT409' } };
      const before = structuredClone(record);
      record = { ...record, revision: 2, status: args.p_status, note: args.p_note };
      events.push({ revision: 2, event_type: 'updated', before_state: before, after_state: structuredClone(record) });
      if (fault === 'history-before') events[1].before_state.id = 'wrong-action';
      if (fault === 'history-after') events[1].after_state.business_id = 'wrong-business';
      if (fault === 'history-created') events[0].after_state.note = 'invented-note';
      return { data: structuredClone(record), error: null };
    } }; },
    from() {
      let updating = false;
      const query = {
        update() { updating = true; return query; }, select() { return query; }, eq() { return query; }, order() { return query; }, limit() { return query; },
        then(resolve, reject) { return Promise.resolve(updating ? { error: { code: '42501' } } : { data: fault === 'history' ? events.slice(0, 1) : events, error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  const denied = { rpc: () => ({ single: async () => fault === 'permission' ? { data: {}, error: null } : { error: { code: '42501' } } }) };
  return { users: [owner, denied, denied], anonymous: denied };
}
test('write verifier accepts a correct synthetic retry/concurrency response contract', async () => {
  const reports = [];
  await verifyWriteIsolation(setup(), 'synthetic-business', 'synthetic-request', message => reports.push(message));
  assert.equal(reports.length, 4);
});
test('write verifier catches duplicates, permission leaks, double winners and broken history/replays', async () => {
  for (const [fault, expected] of [['duplicate', /duplicate actions/], ['permission', /Unauthorised/], ['two-winners', /one winner/], ['history', /event count/], ['replay', /overwrote/]]) {
    await assert.rejects(verifyWriteIsolation(setup(fault), 'synthetic-business', 'synthetic-request'), expected);
  }
});

test('write verifier independently rejects creation leaks for every unauthorised role', async () => {
  for (const role of ['foreign', 'viewer', 'anonymous']) {
    const clients = setup();
    const original = role === 'anonymous' ? clients.anonymous : clients.users[role === 'foreign' ? 1 : 2];
    const leaking = { rpc: (name, args) => name === 'create_control_action'
      ? { single: async () => ({ data: { id: 'unexpected-synthetic-action' }, error: null }) }
      : original.rpc(name, args) };
    if (role === 'anonymous') clients.anonymous = leaking;
    else clients.users[role === 'foreign' ? 1 : 2] = leaking;
    await assert.rejects(verifyWriteIsolation(clients, 'synthetic-business', 'synthetic-request'), /Unauthorised creation/);
  }
});

test('write verifier rejects altered snapshot fields even when winning notes match', async () => {
  for (const fault of ['history-before', 'history-after', 'history-created']) {
    await assert.rejects(verifyWriteIsolation(setup(fault), 'synthetic-business', 'synthetic-request'), /History snapshots/);
  }
  await assert.rejects(verifyWriteIsolation(setup('replay-identity'), 'synthetic-business', 'synthetic-request'), /overwrote/);
});
