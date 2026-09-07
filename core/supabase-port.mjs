import { WorkspaceError } from './workspace.mjs';

// Accept an official supabase-js client already configured with a publishable
// key and the user's Auth session. Never accept a service-role client here.
export function createSupabasePort(client) {
  async function unwrap(request) {
    const { data, error } = await request;
    if (error) throw new WorkspaceError(error.code ?? 'REQUEST_FAILED');
    return data;
  }
  return {
    async verifyUser() {
      const data = await unwrap(client.auth.getUser());
      return data.user;
    },
    memberships() {
      return unwrap(client.from('memberships').select('business_id,role,businesses(name,currency)').order('business_id'));
    },
    async actions(businessId, offset = 0) {
      if (!Number.isSafeInteger(offset) || offset < 0) throw new WorkspaceError('INVALID_PAGE');
      const rows = await unwrap(client.from('control_actions')
        .select('id,business_id,title,owner_label,due_date,status,note,revision')
        .eq('business_id', businessId).order('id').range(offset, offset + 100));
      return { rows: rows.slice(0, 100), hasMore: rows.length > 100 };
    },
    saveAction(id, revision, draft) {
      return unwrap(client.rpc('update_control_action', {
        p_action_id: id, p_expected_revision: revision,
        p_title: draft.title, p_owner_label: draft.owner_label,
        p_due_date: draft.due_date, p_status: draft.status, p_note: draft.note,
      }).single());
    },
    action(businessId, id) {
      return unwrap(client.from('control_actions')
        .select('id,business_id,title,owner_label,due_date,status,note,revision')
        .eq('business_id', businessId).eq('id', id).single());
    },
    createBusiness(name, currency) {
      return unwrap(client.rpc('create_business', { p_name: name, p_currency: currency }).single());
    },
    createAction(businessId, draft) {
      return unwrap(client.from('control_actions').insert({
        business_id: businessId, title: draft.title, owner_label: draft.owner_label,
        due_date: draft.due_date, status: draft.status, note: draft.note,
      }).select('id,business_id,title,owner_label,due_date,status,note,revision').single());
    },
  };
}
