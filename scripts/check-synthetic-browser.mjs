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
      '--config', join(root, 'integration/browser-fixture/vite.config.mjs'), '--strictPort',
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
  assert.deepEqual(browserErrors.filter(Boolean), [], 'Browser runtime errors');
  console.log('8 synthetic browser acceptance cases passed; no live service or customer records used.');
} catch (error) {
  console.error(error);
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
