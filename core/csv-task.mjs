import { inspectCsv, parseMappedCsv } from './csv.mjs';
export async function processCsvTask(request) {
  if (request?.type === 'inspect') {
    if (!request.file || request.file.size > 2 * 1024 * 1024) throw new Error('CSV exceeds 2 MB or is missing.');
    const text = await request.file.text();
    const { header, rows } = inspectCsv(text);
    return { text, header, count: rows.length };
  }
  if (request?.type === 'map') return { rows: parseMappedCsv(request.text, request.section, request.mapping, request.currencyCheck ?? null) };
  throw new Error('Unknown CSV operation.');
}
export function createCsvProcessor(factory) {
  let active = null;
  function cancel() {
    if (!active) return;
    const job = active; active = null;
    job.worker.terminate();
    job.reject(new Error('CSV operation cancelled.'));
  }
  return {
    cancel,
    run(request) {
      cancel();
      return new Promise((resolve, reject) => {
        const worker = factory();
        const job = { worker, reject }; active = job;
        function finish(callback, value) {
          if (active !== job) return;
          active = null; worker.terminate(); callback(value);
        }
        worker.onmessage = event => {
          if (event.data?.ok === true) finish(resolve, event.data.result);
          else finish(reject, new Error(event.data?.error || 'CSV processing failed.'));
        };
        worker.onerror = () => finish(reject, new Error('CSV worker failed. Previous records retained.'));
        worker.onmessageerror = () => finish(reject, new Error('CSV worker response could not be read.'));
        try { worker.postMessage(request); }
        catch { finish(reject, new Error('CSV could not be sent to the background worker.')); }
      });
    },
  };
}
