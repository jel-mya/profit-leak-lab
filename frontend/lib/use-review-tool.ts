'use client';
import { useEffect, useRef } from 'react';
type Summary = {
  currency: string;
  asOf: string;
  investigationMinorUnits: number;
  coverage: Record<string, number>;
};
type Registry = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => Summary;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useReviewTool(summary: Summary) {
  const current = useRef(summary);
  useEffect(() => {
    current.current = summary;
  }, [summary]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: Registry })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'read_financial_review_summary',
            description:
              'Read the visible cash investigation subtotal and data coverage. Amount is in minor currency units, not proven loss or recovery. No records or state change.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input) {
              if (
                input === null ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object.');
              return structuredClone(current.current);
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {
        /* Optional API; no financial values logged. */
      });
    } catch {
      /* Normal UI remains available. */
    }
    return () => lifecycle.abort();
  }, []);
}
