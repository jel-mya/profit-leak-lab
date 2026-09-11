export type ActionSource = { key: string; section: string; recordIds: string[]; amountMinorUnits: number; currency: string; asOf: string; targetMargin: number; importVersion: number };
export function actionSource(section: string, ids: string[], amount: number, currency: string, asOf: string, target: number, version: number): ActionSource;
export function sourceReviewStatus(source: ActionSource, versions: Record<string, number>, currency: string, asOf: string, target: number): string;
export function sourceIndex(data: Record<string, Array<Record<string, string | number>>>): Record<string, Set<string>>;
export function sourcePresence(source: ActionSource, index: Record<string, Set<string>>): string;
export function findingKeys(result: {jobs: Array<{id: string; shortfall: number}>; debtors: Array<{id: string; days: number; outstanding: number}>; labour: Array<{id: string; exposure: number}>; duplicates: Array<{paymentIds: string[]}>}): Set<string>;
