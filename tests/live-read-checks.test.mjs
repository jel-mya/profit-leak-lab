import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyReadIsolation } from '../integration/supabase-read-checks.mjs';
const fixtures = { a: { business: 'synthetic-a', action: 'action-a' }, b: { business: 'synthetic-b', action: 'action-b' } };
function setup(change = () => {}) {
  function client(index) {
    const own = index === 1 ? fixtures.b : fixtures.a;
    return {
      auth: { getUser: async () => ({ data: { user: { id: `user-${index}`, email_confirmed_at: '2026-09-01', is_anonymous: false } }, error: null }) },
      from(table) {
        const request = { table, index };
        const builder = {
          select() { return builder; },
          eq(column, value) { request.column = column; request.value = value; return builder; },
          limit() { return builder; },
          then(resolve, reject) {
            let data = [];
            if (table === 'memberships') data = [{ business_id: own.business, user_id: `user-${index}`, role: index === 2 ? 'viewer' : 'owner' }];
            else if (table === 'businesses' && request.value === own.business) data = [{ id: own.business }];
            else if (table === 'control_actions' && request.value === own.action) data = [{ id: own.action, business_id: own.business }];
            else if (table === 'action_events' && request.value === own.action) data = [{ action_id: own.action, business_id: own.business }];
            const result = { data, error: null };
            change(request, result);
            return Promise.resolve(result).then(resolve, reject);
          },
        };
        return builder;
      },
    };
  }
  return { users: [0, 1, 2].map(client), anonymous: { from: table => ({ select: () => ({ limit: async () => { const result = { data: null, error: { code: '42501' } }; change({ index: 'anonymous', table }, result); return result; } }) }) } };
}
test('live verifier accepts complete synthetic isolation fixtures through read-only clients', async () => {
  const messages = [];
  await verifyReadIsolation(setup(), fixtures, message => messages.push(message));
  assert.equal(messages.length, 3);
});
test('live verifier rejects leaked foreign rows instead of reporting a false pass', async () => {
  const clients = setup((request, result) => {
    if (request.index === 0 && request.table === 'control_actions' && request.value === fixtures.b.action) result.data = [{ id: fixtures.b.action }];
  });
  await assert.rejects(verifyReadIsolation(clients, fixtures), /Cross-tenant/);
});
test('live verifier requires positive own records and history before accepting empty foreign reads', async () => {
  for (const table of ['businesses', 'control_actions', 'action_events']) {
    const clients = setup((request, result) => { if (request.index === 0 && request.table === table) result.data = []; });
    await assert.rejects(verifyReadIsolation(clients, fixtures), /fixture is missing/);
  }
});
test('live verifier distinguishes unavailable API tables from anonymous permission denial', async () => {
  const clients = setup((request, result) => { if (request.index === 'anonymous') result.error = { code: '42P01' }; });
  await assert.rejects(verifyReadIsolation(clients, fixtures), /Anonymous access/);
});
test('live verifier rejects role drift and duplicate authenticated identities', async () => {
  const clients = setup((request, result) => { if (request.index === 2 && request.table === 'memberships') result.data[0].role = 'owner'; });
  await assert.rejects(verifyReadIsolation(clients, fixtures), /membership scope or role/);
  const duplicates = setup(); duplicates.users[2].auth = duplicates.users[0].auth;
  await assert.rejects(verifyReadIsolation(duplicates, fixtures), /distinct/);
});
