// Run only against the disposable synthetic project after positive read checks.
// This intentionally leaves one synthetic action and its append-only history.
export async function verifyWriteIsolation(clients, businessId, requestId, report = () => {}) {
  function require(condition, label) { if (!condition) throw new Error(label); }
  const [owner, foreign, viewer] = clients.users;
  const initial = { p_request_id: requestId, p_business_id: businessId, p_title: 'Synthetic live concurrency check', p_owner_label: '', p_due_date: null, p_status: 'Open', p_note: '' };
  const create = args => owner.rpc('create_control_action', args).single();
  const created = await Promise.all([create(initial), create(initial)]);
  require(created.every(r => !r.error && r.data?.id && Number(r.data.revision) === 1 && r.data.business_id === businessId), 'Concurrent creation failed');
  require(created[0].data.id === created[1].data.id, 'Concurrent creation produced duplicate actions');
  const actionId = created[0].data.id;
  report('Concurrent matching creation requests returned one action');
  require((await create({ ...initial, p_title: 'Changed synthetic request' })).error?.code === 'PT409', 'Changed creation key did not conflict');
  const update = { p_action_id: actionId, p_expected_revision: 1, p_title: initial.p_title, p_owner_label: '', p_due_date: null, p_status: 'Investigating', p_note: 'Synthetic verification only' };
  for (const client of [foreign, viewer, clients.anonymous]) {
    const denied = await client.rpc('update_control_action', update).single();
    require(denied.error?.code === '42501', 'Unauthorised update was not denied');
  }
  const direct = await owner.from('control_actions').update({ title: initial.p_title }).eq('id', actionId);
  require(direct.error?.code === '42501', 'Direct update bypass was not denied');
  report('Foreign, viewer, anonymous and direct-table updates denied');
  const race = await Promise.all([
    owner.rpc('update_control_action', { ...update, p_note: 'Synthetic contender A' }).single(),
    owner.rpc('update_control_action', { ...update, p_note: 'Synthetic contender B' }).single(),
  ]);
  const winners = race.filter(r => !r.error && r.data?.id === actionId && Number(r.data.revision) === 2);
  require(winners.length === 1 && race.filter(r => r.error?.code === 'PT409').length === 1, 'Concurrent updates did not produce one winner and one conflict');
  const replay = await create(initial);
  require(!replay.error && Number(replay.data?.revision) === 2 && replay.data.note === winners[0].data.note, 'Creation replay overwrote a later update');
  const history = await owner.from('action_events').select('revision,event_type,before_state,after_state').eq('action_id', actionId).order('revision').limit(3);
  require(!history.error && history.data?.length === 2, 'Unexpected event count after concurrent requests');
  require(Number(history.data[0].revision) === 1 && history.data[0].event_type === 'created' && Number(history.data[1].revision) === 2 && history.data[1].event_type === 'updated' && history.data[1].before_state?.status === 'Open' && history.data[1].after_state?.note === winners[0].data.note, 'History does not match the winning revision');
  report('Concurrent updates produced one winner, one conflict and exactly two history events');
}
