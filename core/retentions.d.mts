export type RetentionRow = { id: string; jobId: string; counterparty: string; held: string; released: string; releaseDueDate: string };
export type RetentionItem = Omit<RetentionRow, 'held' | 'released'> & { held: number; released: number; remaining: number; state: string };
export type RetentionReport = { items: RetentionItem[]; asOf: string; count: number; held: number; released: number; open: number; reviewAmount: number; pastDateAmount: number; flaggedCount: number };
export const retentionHeaders: string[];
export function validateRetentionRows(rows: RetentionRow[]): Array<Omit<RetentionItem, 'remaining' | 'state'>>;
export function parseRetentionCsv(text: string, currency: string, singleCurrencyConfirmed: boolean): RetentionRow[];
export function reviewRetentions(rows: RetentionRow[], asOf: string): RetentionReport;
