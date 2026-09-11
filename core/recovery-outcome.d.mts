export type RecoveryOutcome = {amountMinorUnits: number; currency: string; date: string; evidence: string; verification: string};
export function recoveryOutcome(amount: string, currency: string, date: string, evidence: string): RecoveryOutcome;
export type RecoveryRevision = {revision: number; recordedAt: string; before: RecoveryOutcome | null; after: RecoveryOutcome};
export function recoveryRevision(history: RecoveryRevision[], before: RecoveryOutcome | undefined, after: RecoveryOutcome, recordedAt: string): RecoveryRevision[];
