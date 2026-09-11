export type ReportingContext = { kind: string; start: string | null; end: string };
export function reportingContext(section: string, start: string, end: string): ReportingContext;
export function sourceReportingLabel(source: {section: string; importVersion: number; currency: string}, history: Array<{section: string; version: number; currency: string; reporting: ReportingContext}>): string;
