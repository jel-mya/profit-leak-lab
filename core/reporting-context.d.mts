export type ReportingContext = { kind: string; start: string | null; end: string; context?: string };
export function reportingContext(section: string, start: string, end: string, context?: string): ReportingContext;
export function sourceReportingLabel(source: {section: string; importVersion: number; currency: string}, history: Array<{section: string; version: number; currency: string; reporting: ReportingContext}>): string;
export function prepareReportingImport(data: Record<string, Record<string, string | number>[]>, preview: {section: string; start: string; end: string; context?: string; rows: Record<string, string>[]}, isDemo: boolean, asOf: string, target: number, currency: string, version: number): {data: Record<string, Record<string, string | number>[]>; entry: {section: string; version: number; reporting: ReportingContext; count: number; currency: string}};

export function reportingLabel(reporting: ReportingContext): string;
export function createImportIdentity(): {
  next(): number;
  isCurrent(id: number): boolean;
  edit<T extends {generation: number}>(preview: T | null, id: number, patch: Partial<T>): T | null;
};
