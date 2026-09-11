export type ReportingContext = { kind: string; start: string | null; end: string };
export function reportingContext(section: string, start: string, end: string): ReportingContext;
