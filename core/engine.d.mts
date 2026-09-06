export type Section = 'jobs' | 'debtors' | 'payments' | 'labour';
export type InputRow = Record<string, string | number>;
export type Input = Partial<Record<Section, InputRow[]>>;
export type Job = { id: string; name: string; revenue: number; materials: number; subcontractors: number; labour: number; other: number; cost: number; profit: number; margin: number | null; shortfall: number };
export type Debtor = { id: string; customer: string; dueDate: string; outstanding: number; days: number; bucket: string; risk: string };
export type Duplicate = { id: string; supplier: string; invoice: string; count: number; amount: number; paymentIds: string[] };
export type Labour = { id: string; jobId: string; person: string; claimedHours: number; approvedHours: number; rate: number; varianceHours: number; exposure: number };
export const sections: Section[];
export const columns: Record<Section, string[]>;
export const controls: string[];
export function dateValue(value: string): number;
export function money(value: string | number): number;
export function validateRows(section: string, rows: InputRow[]): Record<string, string | number>[];
export function analyse(input: Input, asOf: string, targetMargin?: number): {
  jobs: Job[]; debtors: Debtor[]; duplicates: Duplicate[]; labour: Labour[];
  revenue: number; profit: number; margin: number | null; overdue: number; duplicateExposure: number;
  investigation: number; jobShortfall: number; labourExposure: number; coverage: Record<Section, number>;
};
export function controlHealth(answers: Record<number, string>): { answered: number; passed: number; total: number; score: number | null };
