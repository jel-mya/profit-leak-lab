// Append only to the action created by the authorised synthetic write checks.
export async function verifyRecoveryIsolation(clients, original, currency, report = () => {}) {
  function require(value, message) { if (!value) throw new Error(message); }
  function matches(snapshot, row) { return snapshot && Object.keys(row).every(key => Object.hasOwn(snapshot, key) && snapshot[key] === row[key]); }
  require(original?.id && Number(original.revision) === 2 && ['AUD', 'USD', 'GBP', 'CAD', 'NZD'].includes(currency), 'Invalid recovery fixture');
  const [owner, foreign, viewer] = clients.users;
  const args = {p_action_id: original.id, p_expected_revision: 2, p_amount: 1230, p_currency: currency, p_date: '2026-09-12', p_evidence: 'Synthetic recovery verification'};
  const write = (client, input) => client.rpc('record_action_recovery', input).single();
  for (const client of [foreign, viewer, clients.anonymous]) require((await write(client, args)).error?.code === '42501', 'Recovery access was not denied');
  require((await write(owner, {...args, p_currency: currency === 'AUD' ? 'USD' : 'AUD'})).error?.code === '22023', 'Recovery currency mismatch was not denied');
  const race = await Promise.all([write(owner, args), write(owner, {...args, p_amount: 4560})]);
  const winners = race.filter(r => !r.error && r.data?.id === original.id && Number(r.data.revision) === 3);
  require(winners.length === 1 && race.filter(r => r.error?.code === 'PT409').length === 1, 'Recovery race did not produce one winner and conflict');
  const saved = winners[0].data;
  require(saved.business_id === original.business_id && saved.status === original.status && saved.note === original.note
    && [1230, 4560].includes(Number(saved.recovery_amount)) && saved.recovery_currency === currency
    && saved.recovery_date === args.p_date && saved.recovery_evidence === args.p_evidence, 'Recovery result changed unrelated fields or omitted recovery');
  require((await write(owner, args)).error?.code === 'PT409', 'Stale recovery retry was not denied');
  const correction = await write(owner, {...args, p_expected_revision: 3, p_amount: 0, p_evidence: 'Synthetic correction'});
  require(!correction.error && correction.data?.id === original.id && correction.data.business_id === original.business_id
    && Number(correction.data.revision) === 4 && Number(correction.data.recovery_amount) === 0
    && correction.data.recovery_amount != null && correction.data.recovery_currency === currency
    && correction.data.recovery_date === args.p_date && correction.data.recovery_evidence === 'Synthetic correction'
    && correction.data.status === original.status && correction.data.note === original.note, 'Recovery correction did not preserve the record');
  const history = await owner.from('action_events').select('revision,event_type,before_state,after_state').eq('action_id', original.id).order('revision').limit(5);
  require(!history.error && history.data?.length === 4, 'Recovery history event count is incorrect');
  require(Number(history.data[2].revision) === 3 && Number(history.data[3].revision) === 4
    && history.data[2].event_type === 'updated' && history.data[3].event_type === 'updated'
    && matches(history.data[2].before_state, original) && matches(history.data[2].after_state, saved)
    && matches(history.data[3].before_state, saved) && matches(history.data[3].after_state, correction.data), 'Recovery history snapshots do not match');
  report('Recovery access, currency, concurrent revisions and zero-correction history verified');
}
