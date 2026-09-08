import test from 'node:test';
import assert from 'node:assert/strict';
import { processCsvTask, createCsvProcessor } from '../core/csv-task.mjs';
test('CSV task inspection and mapping use the existing bounded parser', async () => {
  const text = 'Number,Customer,Due,Balance\nD1,Synthetic,2026-09-01,12.30';
  const result = await processCsvTask({ type: 'inspect', file: new Blob([text]) });
  assert.equal(result.count, 1); assert.equal(result.text, text);
  const mapped = await processCsvTask({ type: 'map', text, section: 'debtors', mapping: { id: 'Number', customer: 'Customer', dueDate: 'Due', outstanding: 'Balance' } });
  assert.equal(mapped.rows[0].outstanding, '12.30');
  await assert.rejects(processCsvTask({ type: 'inspect', file: new Blob(['x'.repeat(2 * 1024 * 1024 + 1)]) }), /2 MB/);
  await assert.rejects(processCsvTask({ type: 'unknown' }), /Unknown/);
});
function setup() {
  const workers = [];
  const processor = createCsvProcessor(() => {
    const worker = { terminated: false, postMessage(request) { this.request = request; }, terminate() { this.terminated = true; } };
    workers.push(worker); return worker;
  });
  return { processor, workers };
}
test('cancelling a pending task rejects its promise and terminates the worker', async () => {
  const { processor, workers } = setup();
  const pending = processor.run({ type: 'inspect' });
  processor.cancel();
  await assert.rejects(pending, /cancelled/);
  assert.equal(workers[0].terminated, true);
  workers[0].onmessage({ data: { ok: true, result: { count: 999 } } });
  processor.cancel();
});
test('a replacement task discards old responses and terminates after success', async () => {
  const { processor, workers } = setup();
  const first = processor.run({ type: 'inspect' });
  const second = processor.run({ type: 'map' });
  await assert.rejects(first, /cancelled/);
  workers[0].onmessage({ data: { ok: true, result: 'obsolete' } });
  workers[1].onmessage({ data: { ok: true, result: 'current' } });
  assert.equal(await second, 'current');
  assert.equal(workers[1].terminated, true);
});
test('worker parse errors and transport failures release the worker', async () => {
  for (const kind of ['parse', 'runtime', 'message']) {
    const { processor, workers } = setup();
    const pending = processor.run({ type: 'inspect' });
    if (kind === 'parse') workers[0].onmessage({ data: { ok: false, error: 'Invalid CSV' } });
    else if (kind === 'runtime') workers[0].onerror();
    else workers[0].onmessageerror();
    await assert.rejects(pending);
    assert.equal(workers[0].terminated, true);
  }
});

test('background mapping forwards currency checks instead of silently dropping them', async () => {
  const request = { type: 'map', text: 'id,customer,dueDate,outstanding,Currency\nD1,Synthetic,2026-09-01,12,USD', section: 'debtors', mapping: { id: 'id', customer: 'customer', dueDate: 'dueDate', outstanding: 'outstanding' }, currencyCheck: { column: 'Currency', currency: 'AUD' } };
  await assert.rejects(processCsvTask(request), /currency does not match/);
});

test('CSV inspection rejects invalid UTF-8 instead of changing financial identifiers', async () => {
  const prefix = new TextEncoder().encode('id,supplierId,supplier,invoice,amount\nP1,S1,Synthetic,');
  for (const invalid of [[0xff], [0xc3, 0x28], [0xe2, 0x82], [0xed, 0xa0, 0x80]]) {
    const file = new Blob([prefix, new Uint8Array(invalid)]);
    await assert.rejects(processCsvTask({ type: 'inspect', file }), /CSV must use UTF-8/);
  }
});
test('CSV inspection preserves valid Unicode identifiers and accepts a UTF-8 BOM', async () => {
  const text = 'id,supplierId,supplier,invoice,amount\nP1,S1,Synthetic,票-é-123,10';
  for (const prefix of ['', '\ufeff']) {
    const inspected = await processCsvTask({ type: 'inspect', file: new Blob([prefix + text]) });
    const mapped = await processCsvTask({ type: 'map', text: inspected.text, section: 'payments', mapping: { id: 'id', supplierId: 'supplierId', supplier: 'supplier', invoice: 'invoice', amount: 'amount' } });
    assert.equal(mapped.rows[0].invoice, '票-é-123');
  }
});
