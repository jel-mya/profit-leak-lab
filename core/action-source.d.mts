export type ActionSource = { key: string; section: string; recordIds: string[]; amountMinorUnits: number; currency: string; asOf: string; targetMargin: number; importVersion: number };
export function actionSource(section: string, ids: string[], amount: number, currency: string, asOf: string, target: number, version: number): ActionSource;
export function sourceReviewStatus(source: ActionSource, versions: Record<string, number>, currency: string, asOf: string, target: number): string;
