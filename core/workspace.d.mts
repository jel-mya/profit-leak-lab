export type Draft = { title: string; owner_label: string; due_date: string | null; status: string; note: string };
export type Action = Draft & { id: string; business_id: string; revision: number | string };
export type Membership = { business_id: string; role: string; businesses?: { name: string; currency: string } | null };
export type State = { phase: string; userId: string | null; memberships: Membership[]; businessId: string | null; actions: Action[]; hasMore: boolean; offset: number; conflict: null | { id: string; revision: number | string; draft: Draft; current?: Action }; error: string | null };
export interface WorkspacePort {
  verifyUser(): Promise<{ id: string; email_confirmed_at?: string; is_anonymous?: boolean } | null>;
  memberships(): Promise<Membership[]>;
  actions(id: string, offset?: number): Promise<{ rows: Action[]; hasMore: boolean }>;
  action(businessId: string, id: string): Promise<Action>;
  saveAction(id: string, revision: number | string, draft: Draft): Promise<Action>;
  createAction(businessId: string, draft: Draft): Promise<Action>;
  createBusiness(name: string, currency: string): Promise<{ id: string; name: string; currency: string }>;
}
export interface Workspace {
  snapshot(): State;
  subscribe(listener: (state: State) => void): () => boolean;
  disconnect(): void;
  connect(): Promise<void>;
  selectBusiness(id: string, offset?: number): Promise<void>;
  save(id: string, draft: Draft): Promise<Action>;
  reloadConflict(): Promise<void>;
  resolveConflict(draft: Draft): Promise<Action>;
  create(draft: Draft): Promise<Action>;
  onboard(name: string, currency: string): Promise<{ id: string; name: string; currency: string }>;
}
export class WorkspaceError extends Error { code: string; constructor(code: string); }
export function createWorkspace(port: WorkspacePort): Workspace;
