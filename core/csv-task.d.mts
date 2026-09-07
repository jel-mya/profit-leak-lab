export type CsvRequest = { type: 'inspect'; file: Blob } | { type: 'map'; text: string; section: string; mapping: Record<string, string>; currencyCheck?: { column: string; currency: string } };
export type Inspection = { text: string; header: string[]; count: number };
export type Mapped = { rows: Record<string, string>[] };
export interface CsvProcessor {
  cancel(): void;
  run(request: { type: 'inspect'; file: Blob }): Promise<Inspection>;
  run(request: { type: 'map'; text: string; section: string; mapping: Record<string, string>; currencyCheck?: { column: string; currency: string } }): Promise<Mapped>;
}
export function createCsvProcessor(factory: () => Worker): CsvProcessor;
export function processCsvTask(request: CsvRequest): Promise<Inspection | Mapped>;
