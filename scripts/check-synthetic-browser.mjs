// Reproducible, credential-free browser acceptance fixture. Not live Supabase verification.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureUrl = 'http://127.0.0.1:8792/';
const chromePaths = [
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const exists = await import('node:fs').then(m => m.existsSync);
const browserBinary = chromePaths.find(exists);
if (!browserBinary) throw new Error('Set CHROME_BIN to a local Chrome/Chromium/Edge executable. No browser is downloaded.');
async function unusedPort() {
  const server = createServer();
  await new Promise((yes, no) => server.once('error', no).listen(0, '127.0.0.1', yes));
  const port = server.address().port;
  await new Promise(yes => server.close(yes));
  return port;
}
async function poll(fn, label, attempts = 80) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) { last = err; }
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${label}: ${last?.message || 'condition unsatisfied'}`);
}
let vite;
let chrome;
let ws;
let browserClose;
let browserData;
const external = process.argv.includes('--external');
try {
  if (!external) {
    vite = spawn(process.execPath, [
      join(root, 'frontend/node_modules/vite/bin/vite.js'),
      '--config', join(root, 'integration/browser-fixture/vite.config.mjs'), '--port', '8792', '--strictPort',
    ], { cwd: root, stdio: 'pipe', windowsHide: true });
    let viteLog = '';
    vite.stdout.on('data', d => { viteLog += String(d); });
    vite.stderr.on('data', d => { viteLog += String(d); });
    await poll(async () => {
      if (vite.exitCode !== null) throw new Error('Vite exited: ' + viteLog.slice(-1000));
      return (await fetch(fixtureUrl)).ok;
    }, 'synthetic fixture Vite server');
  }
  const port = await unusedPort();
  browserData = await mkdtemp(join(tmpdir(), 'pll-synthetic-browser-'));
  chrome = spawn(browserBinary, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1',
    '--disable-background-networking', '--disable-extensions', '--no-proxy-server',
    '--remote-allow-origins=*', `--remote-debugging-port=${port}`,
    `--user-data-dir=${browserData}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  const page = await poll(async () => {
    const result = await fetch(`http://127.0.0.1:${port}/json`);
    const tabs = await result.json();
    return tabs.find(tab => tab.type === 'page' && tab.webSocketDebuggerUrl);
  }, 'headless browser debugger');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((yes, no) => {
    ws.addEventListener('open', yes, { once: true });
    ws.addEventListener('error', no, { once: true });
  });
  let serial = 0;
  const pending = new Map();
  const browserErrors = [];
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') browserErrors.push(msg.params.exceptionDetails?.text);
    if (!msg.id || !pending.has(msg.id)) return;
    const { yes, no, timer } = pending.get(msg.id);
    clearTimeout(timer);
    pending.delete(msg.id);
    msg.error ? no(new Error(msg.error.message)) : yes(msg.result);
  });
  function command(method, params = {}) {
    return new Promise((yes, no) => {
      const id = ++serial;
      const timer = setTimeout(() => { pending.delete(id); no(new Error('CDP timed out: ' + method)); }, 15000);
      pending.set(id, { yes, no, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  browserClose = () => command('Browser.close');
  async function evaluate(source) {
    const answer = await command('Runtime.evaluate', {
      expression: source, returnByValue: true, awaitPromise: true,
    });
    if (answer.exceptionDetails) throw new Error(answer.exceptionDetails.text);
    return answer.result?.value;
  }
  const waitText = (text, selector = 'body') => poll(
    () => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent?.includes(${JSON.stringify(text)})`),
    text,
    65,
  );
  async function click(label) {
    const success = await evaluate(`(() => {
      const item = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)});
      if (!item || item.disabled) return false;
      item.click(); return true;
    })()`);
    assert.equal(success, true, `Expected enabled button: ${label}`);
  }
  async function setValue(selector, value) {
    const changed = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const desc = Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value');
      desc.set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
      if (!(el instanceof HTMLSelectElement)) el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    assert.equal(changed, true, `Missing form field ${selector}`);
  }
  async function chooseBusiness(role) {
    await waitText('Choose a business', 'main');
    await click(`Synthetic business · ${role}`);
    await waitText('Saved actions', 'main');
  }
  async function openRecovery() {
    await evaluate("document.querySelector('.action-card details')?.setAttribute('open','')");
    await waitText('Total reported recovery', '.action-card details');
  }
  async function enterRecovery(amount = '12.00') {
    await openRecovery();
    await setValue('input[aria-label^="Recovery amount for"]', amount);
    await setValue('.action-card details input[type="date"]', '2026-09-30');
    await setValue('.action-card details input[maxlength="1000"]', 'Synthetic acceptance evidence');
    await waitText('Unsaved entry', '.action-card details');
  }
  async function scenario(name, role) {
    await setValue('aside select', name);
    await chooseBusiness(role);
  }
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Page.navigate', { url: fixtureUrl });
  await waitText('synthetic acceptance fixture');
  await chooseBusiness('editor');
  assert.equal(await evaluate("document.querySelectorAll('.action-card').length"), 2);
  await enterRecovery();
  await click('Save reported recovery');
  await waitText('Reported recovery saved.', '.action-card');
  await click('Inspect synthetic writes');
  await waitText('Synthetic writes: 1', 'aside');
  console.log('PASS: editor saves one synthetic recovery and clears the local form.');

  await scenario('viewer', 'viewer');
  assert.equal(await evaluate("Boolean(document.querySelector('.action-card details'))"), false);
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='Edit action')"), false);
  console.log('PASS: viewer cannot see edit or recovery submission controls.');

  await click('View change history');
  await waitText('Action updated · revision 2', '.history-review');
  await waitText('Recorded by your account', '.history-review');
  await waitText('Before: Not set', '.history-fields');
  await waitText('After: Synthetic reviewer', '.history-fields');
  assert.equal(await evaluate("document.querySelectorAll('.history-review input, .history-review textarea').length"), 0);
  await click('Older changes');
  await waitText('Tracking baseline · revision 1', '.history-review');
  await waitText('No actor recorded for this baseline', '.history-review');
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Older changes').disabled"), true);
  await click('Latest changes');
  await waitText('Action updated · revision 2', '.history-review');
  await click('Close history');
  assert.equal(await evaluate("Boolean(document.querySelector('.history-review'))"), false);
  await click('Inspect synthetic writes');
  await waitText('Synthetic writes: 0', 'aside');
  console.log('PASS: viewer reads immutable history fields, navigates baseline/latest pages and closes without writes.');

  await scenario('conflict', 'editor');
  await enterRecovery('23.00');
  await click('Save reported recovery');
  await waitText('Check the recovery before another change', 'main');
  await click('Load current recovery');
  await waitText('Current saved record', 'main');
  await click('I reviewed this; use current record');
  await click('Inspect synthetic writes');
  await waitText('Synthetic writes: 1', 'aside');
  console.log('PASS: conflict review requires acknowledgement without an automatic duplicate write.');

  await scenario('uncertain', 'editor');
  await enterRecovery('24.00');
  await click('Save reported recovery');
  await waitText('Check the recovery before another change', 'main');
  await click('Load current recovery');
  await click('I reviewed this; use current record');
  await click('Inspect synthetic writes');
  await waitText('Synthetic writes: 1', 'aside');
  console.log('PASS: uncertain recovery requires read/acknowledgement without automatic replay.');

  await scenario('success', 'editor');
  await enterRecovery('25.00');
  await click('Switch business');
  assert.match(await evaluate("document.querySelector('aside').textContent"), /unsaved/i, 'Navigation confirmation must mention unsaved recovery');
  assert.equal(await evaluate("document.querySelector('main')?.textContent?.includes('Saved actions')"), true);
  console.log('PASS: unsaved recovery prevents unapproved business navigation.');

  await scenario('success', 'editor');
  await click('Next');
  await waitText('Synthetic action-100', '.action-card');
  await click('Previous');
  await waitText('Synthetic action-0', '.action-card');
  console.log('PASS: 100-action pagination moves forward and backward without mixing records.');

  await enterRecovery('-1');
  await click('Save reported recovery');
  await waitText('Enter a non-negative amount', '.action-card details');
  await click('Inspect synthetic writes');
  await waitText('Synthetic writes: 0', 'aside');
  console.log('PASS: invalid recovery entry fails before any synthetic server write.');

  await click('Simulate remote access loss');
  await waitText('Sign in to the pilot', 'main');
  assert.equal(await evaluate("document.querySelector('main')?.textContent?.includes('Saved actions')"), false);
  console.log('PASS: remote access loss clears the financial-action view.');

  await command('Page.navigate', { url: fixtureUrl + '?retentions' });
  await waitText('Review held retentions.');
  await setValue('input[type="date"]', '2026-10-20');
  const retentionCsv = [
    'id,jobId,counterparty,held,released,releaseDueDate',
    'past,SYNTHETIC-JOB,Synthetic builder,100,20,2026-10-19',
    'today,SYNTHETIC-JOB,Synthetic builder,200,50,2026-10-20',
    'future,SYNTHETIC-JOB,Synthetic builder,300,0,2026-10-21',
    'released,SYNTHETIC-JOB,Synthetic builder,400,400,2026-10-01',
  ].join('\n');
  async function importRetention(csv) {
    await evaluate(`(() => {
      const input = document.querySelector('input[type="file"]');
      const transfer = new DataTransfer();
      transfer.items.add(new File([${JSON.stringify(csv)}], 'synthetic-retentions.csv', {type:'text/csv'}));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
  }
  await importRetention(retentionCsv);
  await waitText('Confirm the consistent amount/tax basis', 'output');
  await evaluate("document.querySelectorAll('input[type=\"checkbox\"]')[0].click()");
  await importRetention(retentionCsv);
  await waitText('Confirm that the whole export uses the selected currency.', 'output');
  assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Retention results\"]'))"), false);
  console.log('PASS: retention import requires amount/date basis and explicit missing-column currency confirmation.');

  await evaluate("document.querySelectorAll('input[type=\"checkbox\"]')[1].click()");
  await importRetention(retentionCsv);
  await waitText('Reviewed 4 retention records.', 'output');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('tbody tr')].map(row=>row.lastElementChild.textContent)"),
    ['Past listed date', 'Date reached today', 'Upcoming', 'Fully released']);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.retention-metrics strong')].map(el=>el.textContent)"),
    ['$1,000.00', '$470.00', '$530.00', '$230.00', '$80.00']);
  assert.equal(await evaluate("document.querySelector('select').disabled"), true);
  console.log('PASS: retention review displays separate date states and reconciled totals and locks loaded currency.');

  await importRetention(retentionCsv.replace('100,20', '100,120'));
  await waitText('released exceeds held', 'output');
  assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"), 4);
  assert.equal(await evaluate("document.querySelectorAll('.retention-metrics strong')[2].textContent"), '$530.00');
  await click('Clear review');
  assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Retention results\"]'))"), false);
  assert.equal(await evaluate("document.querySelector('select').disabled"), false);
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Download review JSON').disabled"), true);
  console.log('PASS: invalid retention replacement preserves the prior review; clearing removes results and disables download.');
  const pagedRetentions = [retentionCsv.split('\n')[0], ...Array.from({length: 51}, (_, i) =>
    `synthetic-${i},SYNTHETIC-JOB,Synthetic builder,10,2,2026-10-19`)].join('\n');
  await importRetention(pagedRetentions);
  await waitText('Reviewed 51 retention records.', 'output');
  assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"), 50);
  await click('Next');
  await waitText('Page 2 of 2', 'nav');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('tbody tr')].map(row=>row.firstElementChild.textContent)"), ['synthetic-50']);
  assert.equal(await evaluate("document.querySelectorAll('.retention-metrics strong')[2].textContent"), '$408.00');
  await click('Previous');
  await waitText('Page 1 of 2', 'nav');
  assert.equal(await evaluate("document.querySelector('tbody tr').firstElementChild.textContent"), 'synthetic-0');
  console.log('PASS: retention pagination preserves whole-report totals across 51 records.');

  // Capture the browser-created Blob in memory, avoiding a filesystem download.
  await evaluate(`(() => {
    window.retentionExport = null;
    const create = URL.createObjectURL;
    URL.createObjectURL = blob => { window.retentionExport = blob.text(); return create(blob); };
    HTMLAnchorElement.prototype.click = function () { window.retentionFilename = this.download; };
  })()`);
  await click('Download review JSON');
  const exported = JSON.parse(await evaluate('window.retentionExport'));
  assert.equal(await evaluate('window.retentionFilename'), 'retention-review-2026-10-20.json');
  assert.equal(exported.reportType, 'retention-date-review');
  assert.equal(exported.currency, 'AUD');
  assert.equal(exported.asOf, '2026-10-20');
  assert.equal(exported.count, 51);
  assert.equal(exported.items.length, 51);
  assert.equal(exported.items[50].id, 'synthetic-50');
  assert.equal(exported.open, 40800);
  assert.equal(exported.reviewAmount, 40800);
  assert.match(exported.releaseDates, /not legally verified/);
  await click('Next');
  await waitText('Page 2 of 2', 'nav');
  await importRetention(retentionCsv);
  await waitText('Reviewed 4 retention records.', 'output');
  await waitText('Page 1 of 1', 'nav');
  console.log('PASS: retention JSON contains all records and explicit context; replacement resets pagination.');
  await setValue('input[type="date"]', '');
  await waitText('Enter a valid review date', '[role="alert"]');
  assert.equal(await evaluate("Boolean(document.querySelector('[aria-label=\"Retention results\"]'))"), false);
  assert.equal(await evaluate("document.querySelector('input[type=\"date\"]').getAttribute('aria-invalid')"), 'true');
  assert.equal(await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Download review JSON').disabled"), true);
  await setValue('input[type="date"]', '2026-10-20');
  await waitText('3. Review exceptions');
  assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"), 4);
  assert.equal(await evaluate("Boolean(document.querySelector('[role=\"alert\"]'))"), false);
  console.log('PASS: missing review date explains hidden results and correction restores the loaded records.');
  assert.deepEqual(browserErrors.filter(Boolean), [], 'Browser runtime errors');
  console.log('15 synthetic browser acceptance cases passed; no live service or customer records used.');
} catch (error) {
  console.error(error);
  // Surface the actual failure in public check annotations, not only gated job logs.
  if (process.env.GITHUB_ACTIONS === 'true') {
    const detail = String(error?.stack || error).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.error(`::error title=Synthetic browser acceptance::${detail}`);
  }
  process.exitCode = 1;
} finally {
  if (browserClose) {
    try { await Promise.race([browserClose(), delay(1500)]); }
    catch { /* The browser may already have closed. */ }
  }
  if (ws) ws.close();
  if (chrome) chrome.kill();
  if (vite) vite.kill();
  if (browserData) {
    try { await rm(browserData, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); }
    catch { /* Chrome child processes may briefly retain their temporary profile on Windows. */ }
  }
  // CDP and the Vite subprocess can retain Windows handles after successful teardown.
  process.exit(process.exitCode ?? 0);
}
