export type RecoveryOutcome = {amountMinorUnits: number; currency: string; date: string; evidence: string; verification: string};
export function recoveryOutcome(amount: string, currency: string, date: string, evidence: string): RecoveryOutcome;
