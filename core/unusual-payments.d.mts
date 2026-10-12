import type { InputRow } from './engine.mjs';
export type UnusualPayment = {
  id: string;
  supplier: string;
  invoice: string;
  reason: string;
  paymentIds: string[];
  amounts: number[];
};
export function reviewUnusualPayments(rows: InputRow[]): UnusualPayment[];
