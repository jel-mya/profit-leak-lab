import { processCsvTask, type CsvRequest } from '../../core/csv-task.mjs';
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<CsvRequest>) => void) | null;
  postMessage: (reply: unknown) => void;
};
scope.onmessage = (event) => {
  void processCsvTask(event.data).then(
    (result) => scope.postMessage({ ok: true, result }),
    (error: unknown) =>
      scope.postMessage({
        ok: false,
        error:
          error instanceof Error ? error.message : 'CSV processing failed.',
      }),
  );
};
