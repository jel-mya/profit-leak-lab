import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
const directory = new URL('../frontend/dist/client/_next/static/workers/', import.meta.url);
const files = (await readdir(directory)).filter(name => /^csv\.worker-.*\.js$/.test(name));
assert.equal(files.length, 1, 'Expected one emitted CSV worker');
const worker = new Worker(`
  const { parentPort } = require('node:worker_threads');
  global.self = { postMessage: value => parentPort.postMessage(value) };
  parentPort.on('message', data => self.onmessage({ data }));
  import(${JSON.stringify(new URL(files[0], directory).href)}).then(() => parentPort.postMessage({ ready: true }));
`, { eval: true });
function receive(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(reject, new Error('CSV worker smoke timed out')), 5000);
    function finish(callback, value) { clearTimeout(timer); worker.off('message', message); worker.off('error', error); callback(value); }
    function message(value) { finish(resolve, value); }
    function error(value) { finish(reject, value); }
    worker.once('message', message); worker.once('error', error);
    if (request) worker.postMessage(request);
  });
}
try {
  assert.equal((await receive()).ready, true);
  const text = 'id,customer,dueDate,outstanding\nD1,Synthetic,2026-09-01,12.30';
  const inspected = await receive({ type: 'inspect', file: new Blob([text]) });
  assert.equal(inspected.ok, true); assert.equal(inspected.result.count, 1);
  const mapped = await receive({ type: 'map', text, section: 'debtors', mapping: { id: 'id', customer: 'customer', dueDate: 'dueDate', outstanding: 'outstanding' } });
  assert.equal(mapped.ok, true); assert.equal(mapped.result.rows[0].outstanding, '12.30');
  const mismatch = await receive({ type: 'map', text: text.replace('outstanding\n', 'outstanding,Currency\n') + ',USD', section: 'debtors', mapping: { id: 'id', customer: 'customer', dueDate: 'dueDate', outstanding: 'outstanding' }, currencyCheck: { column: 'Currency', currency: 'AUD' } });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.error, /currency/);
  assert.equal((await receive({ type: 'unknown' })).ok, false);
  console.log('Emitted CSV worker smoke passed (Node worker shim; not browser verification).');
} finally { await worker.terminate(); }
