
export type RecoveryDraft = Readonly<{
  amount: string;
  date: string;
  evidence: string;
  currency: string;
}>;

export function recoveryDraftCurrency(action: Record<string, any>, reviewCurrency: string): string;
export function recoveryDraftForAction(action: Record<string, any>, reviewCurrency: string): RecoveryDraft;
export function recoveryDraftChanged(action: Record<string, any>, draft: RecoveryDraft | undefined, reviewCurrency: string): boolean;
export function hasRecoveryDraftChanges(actions: Array<Record<string, any>>, drafts: Record<string, RecoveryDraft>, reviewCurrency: string): boolean;
export function updateRecoveryDraft(drafts: Record<string, RecoveryDraft>, action: Record<string, any>, reviewCurrency: string, patch: Partial<RecoveryDraft>): Readonly<Record<string, RecoveryDraft>>;
export function clearRecoveryDraft(drafts: Record<string, RecoveryDraft>, actionId: string): Readonly<Record<string, RecoveryDraft>>;
export function pruneRecoveryDrafts(actions: Array<Record<string, any>>, drafts: Record<string, RecoveryDraft>): Readonly<Record<string, RecoveryDraft>>;
export function recoveryDraftSummary(actions: Array<Record<string, any>>, drafts: Record<string, RecoveryDraft>, reviewCurrency: string): Readonly<{count:number;actionIds:readonly string[];hasChanges:boolean}>;
