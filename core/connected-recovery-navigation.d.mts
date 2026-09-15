export type RecoveryDraftFields = {
  amount?: string;
  date?: string;
  evidence?: string;
};

export function recoveryDraftIsDirty(draft?: RecoveryDraftFields): boolean;
export function updateDirtyRecoveryActions(
  current: Set<string>,
  actionId: string,
  dirty: boolean,
): Set<string>;
export function hasUnsavedRecovery(current: Set<string>): boolean;
export function recoveryDiscardWarning(count: number): string;
export function canLeaveRecoveryView(
  current: Set<string>,
  confirmLeave: (message: string) => boolean,
): boolean;
export function clearDirtyRecoveryAfterAcknowledgedNavigation(): Set<string>;
