// In-memory coordinator for the opt-in authenticated UI. No tokens, browser
// storage, imports or automatic conflict retries belong in this state.
import { requireActionOutcome } from './action-outcome.mjs';
import { dateValue } from './engine.mjs';
export class WorkspaceError extends Error {
  constructor(code) { super(code); this.name = 'WorkspaceError'; this.code = code; }
}
const editable = ['title', 'owner_label', 'due_date', 'status', 'note'];
function draftFields(draft) {
  if (!draft || typeof draft !== 'object') throw new WorkspaceError('INVALID_DRAFT');
  const values = Object.fromEntries(editable.map(k => [k, draft[k]]));
  if (typeof values.title !== 'string' || !values.title.trim() || values.title.length > 200
    || typeof values.owner_label !== 'string' || values.owner_label.length > 100
    || typeof values.note !== 'string' || values.note.length > 1000
    || !['Open', 'Investigating', 'Resolved', 'Dismissed'].includes(values.status)
    || (values.due_date !== null && (typeof values.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(values.due_date)))) {
    throw new WorkspaceError('INVALID_DRAFT');
  }
  if (values.due_date !== null) {
    try { dateValue(values.due_date); } catch { throw new WorkspaceError('INVALID_DRAFT'); }
  }
  try { requireActionOutcome(values.status, values.note); } catch { throw new WorkspaceError('OUTCOME_REQUIRED'); }
  return values;
}
export function createWorkspace(port) {
  let generation = 0;
  let state = { phase: 'signedOut', userId: null, memberships: [], businessId: null, actions: [], hasMore: false, offset: 0, conflict: null, history: null, error: null };
  const listeners = new Set();
  function publish(patch) { state = { ...state, ...patch }; for (const listener of listeners) listener(structuredClone(state)); }
  function clear(phase = 'signedOut', error = null) {
    generation++;
    publish({ phase, userId: null, memberships: [], businessId: null, actions: [], hasMore: false, offset: 0, conflict: null, history: null, error });
  }
  function current(ticket) { if (ticket !== generation) throw new WorkspaceError('STALE_REQUEST'); }
  function code(error) { return error?.code ?? 'REQUEST_FAILED'; }
  function accessLost(error) { return ['42501', 'PGRST301', 'PGRST302', 'INVALID_RESPONSE'].includes(code(error)); }
  const workspace = {
    snapshot: () => structuredClone(state),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    disconnect() { clear(); },
    async connect() {
      clear('loading');
      const ticket = generation;
      try {
        const user = await port.verifyUser(); current(ticket);
        if (!user?.id || user.is_anonymous || !user.email_confirmed_at) throw new WorkspaceError('VERIFIED_SIGN_IN_REQUIRED');
        const memberships = await port.memberships(); current(ticket);
        publish({ phase: 'chooseBusiness', userId: user.id, memberships, error: null });
      } catch (error) {
        if (ticket === generation) clear('signedOut', code(error));
        throw error;
      }
    },
    async selectBusiness(id, offset = 0) {
      if (!Number.isSafeInteger(offset) || offset < 0) throw new WorkspaceError('INVALID_PAGE');
      if (!state.userId || !state.memberships.some(m => m.business_id === id)) throw new WorkspaceError('ACCESS_DENIED');
      const ticket = ++generation;
      publish({ phase: 'loading', businessId: id, actions: [], hasMore: false, conflict: null, history: null, error: null });
      try {
        const result = await port.actions(id, offset); current(ticket);
        if (result.rows.some(a => a.business_id !== id)) throw new WorkspaceError('INVALID_RESPONSE');
        publish({ phase: 'ready', actions: result.rows, hasMore: result.hasMore, offset });
      } catch (error) {
        if (ticket === generation) {
          if (accessLost(error)) clear('signedOut', 'ACCESS_LOST');
          else publish({ phase: 'chooseBusiness', businessId: null, actions: [], hasMore: false, offset: 0, error: code(error) });
        }
        throw error;
      }
    },
    async loadHistory(id, before = null) {
      if (state.phase !== 'ready') throw new WorkspaceError('NOT_READY');
      if (!state.actions.some(a => a.id === id)) throw new WorkspaceError('ACTION_NOT_LOADED');
      if (before !== null && !/^[1-9][0-9]*$/.test(String(before))) throw new WorkspaceError('INVALID_PAGE');
      const ticket = ++generation;
      const businessId = state.businessId;
      publish({ history: null, error: null });
      try {
        const result = await port.history(businessId, id, before); current(ticket);
        if (result.rows.some(event => event.action_id !== id || event.business_id !== businessId)) throw new WorkspaceError('INVALID_RESPONSE');
        publish({ history: { actionId: id, rows: result.rows, hasMore: result.hasMore } });
      } catch (error) {
        if (ticket === generation) {
          if (accessLost(error)) clear('signedOut', 'ACCESS_LOST');
          else publish({ error: code(error) });
        }
        throw error;
      }
    },
    closeHistory() { if (state.phase !== 'ready') throw new WorkspaceError('NOT_READY'); generation++; publish({ history: null }); },
    async save(id, draft) {
      if (state.phase !== 'ready') throw new WorkspaceError('NOT_READY');
      const membership = state.memberships.find(m => m.business_id === state.businessId);
      if (!['owner', 'editor'].includes(membership?.role)) throw new WorkspaceError('ACCESS_DENIED');
      const original = state.actions.find(a => a.id === id);
      if (!original) throw new WorkspaceError('ACTION_NOT_LOADED');
      const values = draftFields(draft);
      const ticket = ++generation;
      // Serialise saves in this controller. Database revisions remain authoritative.
      publish({ phase: 'saving', history: null, error: null });
      try {
        const saved = await port.saveAction(original.id, original.revision, values); current(ticket);
        if (saved.id !== id || saved.business_id !== state.businessId) throw new WorkspaceError('INVALID_RESPONSE');
        publish({ phase: 'ready', actions: state.actions.map(a => a.id === id ? saved : a), conflict: null });
        return structuredClone(saved);
      } catch (error) {
        if (ticket === generation) {
          if (code(error) === 'PT409') publish({ phase: 'conflict', conflict: { id, revision: original.revision, draft: values }, error: 'PT409' });
          else if (accessLost(error)) clear('signedOut', 'ACCESS_LOST');
          else publish({ phase: 'ready', error: code(error) });
        }
        throw error;
      }
    },
    async reloadConflict() {
      if (state.phase !== 'conflict') throw new WorkspaceError('NO_CONFLICT');
      const ticket = ++generation;
      const conflict = structuredClone(state.conflict);
      try {
        const latest = await port.action(state.businessId, conflict.id); current(ticket);
        if (latest.id !== conflict.id || latest.business_id !== state.businessId) throw new WorkspaceError('INVALID_RESPONSE');
        publish({ conflict: { ...conflict, current: latest } });
      } catch (error) {
        if (ticket === generation) {
          if (accessLost(error) || code(error) === 'PGRST116') clear('signedOut', 'ACCESS_LOST');
          else publish({ error: code(error) });
        }
        throw error;
      }
    },
    async resolveConflict(mergedDraft) {
      if (state.phase !== 'conflict' || !state.conflict?.current) throw new WorkspaceError('RELOAD_REQUIRED');
      draftFields(mergedDraft);
      const latest = state.conflict.current;
      publish({ phase: 'ready', actions: state.actions.map(a => a.id === latest.id ? latest : a) });
      return workspace.save(latest.id, mergedDraft);
    },
    async create(draft) {
      if (state.phase !== 'ready') throw new WorkspaceError('NOT_READY');
      if (!state.memberships.some(m => m.business_id === state.businessId && ['owner', 'editor'].includes(m.role))) throw new WorkspaceError('ACCESS_DENIED');
      const values = draftFields(draft);
      const id = state.businessId;
      const ticket = ++generation;
      publish({ phase: 'saving', history: null, error: null });
      try {
        const created = await port.createAction(id, values); current(ticket);
        if (created.business_id !== id) throw new WorkspaceError('INVALID_RESPONSE');
        // Return the created record without assuming it falls on the current page.
        publish({ phase: 'ready' });
        return structuredClone(created);
      } catch (error) {
        if (ticket === generation) {
          if (accessLost(error)) clear('signedOut', 'ACCESS_LOST');
          else publish({ phase: 'ready', error: code(error) });
        }
        throw error;
      }
    },
    async onboard(name, currency) {
      if (state.phase !== 'chooseBusiness' || !state.userId) throw new WorkspaceError('NOT_READY');
      const ticket = ++generation;
      publish({ phase: 'loading', error: null });
      try {
        const business = await port.createBusiness(name, currency); current(ticket);
        await workspace.connect();
        return business;
      } catch (error) {
        if (ticket === generation) {
          if (accessLost(error)) clear('signedOut', 'ACCESS_LOST');
          else publish({ phase: 'chooseBusiness', error: code(error) });
        }
        throw error;
      }
    },
  };
  return workspace;
}
