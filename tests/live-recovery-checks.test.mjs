import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRecoveryIsolation } from '../integration/supabase-recovery-checks.mjs';
const original = {id: 'synthetic-action', business_id: 'synthetic-business', revision: 2, status: 'Investigating', note: 'Synthetic'};
function setup(fault) {
  let row = {...original};
  const events = [{}, {}];
  const owner = {
    rpc(name, args) {
      assert.equal(name, 'record_action_recovery');
      return {single: async () => {
        if (args.p_currency !== 'AUD') return {error: {code: fault === 'currency' ? 'OTHER' : '22023'}};
        if (args.p_expected_revision !== row.revision && fault !== 'race') return {error: {code: 'PT409'}};
        const before = {...row};
        row = {...row, revision: args.p_expected_revision + 1, recovery_amount: args.p_amount, recovery_currency: args.p_currency, recovery_date: args.p_date, recovery_evidence: args.p_evidence};
        if (fault === 'status') row.status = 'Resolved';
        if (fault === 'zero' && args.p_amount === 0) row.recovery_amount = null;
        events.push({revision: row.revision, event_type: 'updated', before_state: before, after_state: {...row}});
        return {data: {...row}, error: null};
      }};
    },
    from() {
      const query = {select() {return query;}, eq() {return query;}, order() {return query;}, limit: async () => {
        if (fault === 'history') events[2].after_state.recovery_amount = 999;
        return {data: fault === 'count' ? events.slice(0, 3) : events, error: null};
      }};
      return query;
    },
  };
  const denied = {rpc: () => ({single: async () => ({error: {code: fault === 'permission' ? 'OTHER' : '42501'}})})};
  return {users: [owner, denied, denied], anonymous: denied};
}
test('recovery live verifier accepts isolated writes and exact correction history', async () => {
  const reports = [];
  await verifyRecoveryIsolation(setup(), original, 'AUD', message => reports.push(message));
  assert.equal(reports.length, 1);
});
test('recovery live verifier rejects permission, currency, race, record and audit failures', async () => {
  for (const fault of ['permission', 'currency', 'race', 'status', 'zero', 'history', 'count']) {
    await assert.rejects(verifyRecoveryIsolation(setup(fault), original, 'AUD'), undefined, fault);
  }
});
