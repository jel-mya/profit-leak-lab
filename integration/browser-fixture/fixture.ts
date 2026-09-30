export let scenario = 'success';
export let writes = 0;
let authCallback;
export function configure(value) { scenario = value; writes = 0; }
export function revoke() { authCallback?.('SIGNED_OUT', null); }
const record = (id, business_id = 'a') => ({ id, business_id, title: `Synthetic ${id}`, owner_label: '', due_date: null, status: 'Open', note: '', revision: 1 });
export function createClient() { return { auth: {
  onAuthStateChange(callback) { authCallback = callback; setTimeout(() => callback('SIGNED_IN', { user: { id: 'synthetic-user' } }), 0); return { data: { subscription: { unsubscribe() {} } } }; },
  async signOut() { revoke(); return {}; },
  async stopAutoRefresh() {},
} }; }
export function createSupabasePort() { return {
  verifyUser: async () => ({ id: 'synthetic-user', email_confirmed_at: '2026-09-01', is_anonymous: false }),
  memberships: async () => [{ business_id: 'a', role: scenario === 'viewer' ? 'viewer' : 'editor', businesses: { name: 'Synthetic business', currency: 'AUD' } }],
  actions: async (id, offset) => ({ rows: [record(`action-${offset || 0}`, id), record(`second-${offset || 0}`, id)], hasMore: true }),
  action: async (businessId, id) => ({ ...record(id, businessId), revision: 2 }),
  recordRecovery: async (id, revision, input) => {
    writes++;
    if (scenario === 'conflict') throw { code: 'PT409' };
    if (scenario === 'uncertain') throw { code: 'NETWORK_FAILURE' };
    return { ...record(id), revision: revision + 1, recovery_amount: input.amountMinorUnits, recovery_currency: input.currency, recovery_date: input.date, recovery_evidence: input.evidence };
  },
}; }
