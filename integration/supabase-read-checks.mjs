// Read-only financial-table checks. Authentication itself creates temporary sessions.
export async function verifyReadIsolation(clients, fixtures, report = () => {}) {
  function require(condition, label) { if (!condition) throw new Error(label); }
  async function rows(query, label) {
    const result = await query;
    require(!result.error && Array.isArray(result.data), label);
    return result.data;
  }
  const identities = [];
  for (const [index, client] of clients.users.entries()) {
    const result = await client.auth.getUser();
    const user = result.data?.user;
    require(!result.error && user?.id && user.email_confirmed_at && !user.is_anonymous, `Identity ${index + 1} is not verified`);
    identities.push(user.id);
  }
  require(new Set(identities).size === 3, 'Three distinct test identities are required');
  report('Verified three distinct authenticated identities');
  const roles = ['owner', 'owner', 'viewer'];
  const tenants = [fixtures.a, fixtures.b, fixtures.a];
  for (const [index, client] of clients.users.entries()) {
    const own = tenants[index];
    const foreign = own === fixtures.a ? fixtures.b : fixtures.a;
    const membership = await rows(client.from('memberships').select('business_id,user_id,role'), 'Membership read failed');
    require(membership.length === 1 && membership[0].business_id === own.business && membership[0].user_id === identities[index] && membership[0].role === roles[index], 'Fixture membership scope or role does not match');
    const business = await rows(client.from('businesses').select('id').eq('id', own.business), 'Own business read failed');
    require(business.length === 1 && business[0].id === own.business, 'Own business fixture is missing');
    const actions = await rows(client.from('control_actions').select('id,business_id').eq('id', own.action), 'Own action read failed');
    require(actions.length === 1 && actions[0]?.id === own.action && actions[0].business_id === own.business, 'Own action fixture is missing or misassigned');
    const history = await rows(client.from('action_events').select('action_id,business_id').eq('action_id', own.action).limit(1), 'Own history read failed');
    require(history.length === 1 && history[0]?.action_id === own.action && history[0].business_id === own.business, 'Own history fixture is missing or misassigned');
    for (const [table, column, id] of [['businesses', 'id', foreign.business], ['control_actions', 'id', foreign.action], ['action_events', 'action_id', foreign.action]]) {
      const hidden = await rows(client.from(table).select(column).eq(column, id).limit(1), 'Foreign read did not return a valid filtered response');
      require(hidden.length === 0, 'Cross-tenant record exposure detected');
    }
  }
  report('Owners and viewer can read their fixtures; foreign business, action and history IDs are hidden');
  for (const table of ['businesses', 'memberships', 'control_actions', 'action_events']) {
    const result = await clients.anonymous.from(table).select('*').limit(1);
    require(result.error?.code === '42501' || (!result.error && Array.isArray(result.data) && result.data.length === 0), 'Anonymous access was not safely denied');
  }
  report('Anonymous financial-table access denied');
}
