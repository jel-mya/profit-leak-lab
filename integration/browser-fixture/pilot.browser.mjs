// Optional synthetic browser acceptance: no real Auth accounts or financial records.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const packagePath = process.env.PUPPETEER_MODULE || process.env.PUPPETEER_PATH || 'puppeteer';
let puppeteer;
try { puppeteer = require(packagePath); }
catch { throw new Error('Install Puppeteer locally or set PUPPETEER_MODULE to an existing Puppeteer installation.'); }
const baseUrl = process.env.PILOT_FIXTURE_URL || 'http://127.0.0.1:8794/';
let vite;
if (!process.env.PILOT_FIXTURE_URL) {
  const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
  vite = spawn(process.execPath, [
    'frontend/node_modules/vite/bin/vite.js', '--config',
    'integration/browser-fixture/vite.config.mjs', '--port', '8794', '--strictPort',
  ], { cwd: projectRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverError = '';
  vite.stderr.on('data', chunk => { serverError = (serverError + chunk).slice(-1200); });
  let ready = false;
  for (let attempt = 0; attempt < 70; attempt++) {
    if (vite.exitCode !== null) break;
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(800) });
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the locally spawned synthetic fixture server. */ }
    await sleep(200);
  }
  if (!ready) {
    vite.kill();
    throw new Error('Synthetic Vite fixture unavailable on port 8794: ' + serverError);
  }
}
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, args: ['--no-sandbox', '--disable-background-networking'],
  });
} catch (error) {
  vite?.kill();
  throw error;
}
let successes = 0;
function passed(message) { console.log('PASS', message); successes++; }
async function contains(page, content, timeout = 6000) {
  await page.waitForFunction(text => document.body.innerText.includes(text), { timeout }, content);
}
async function clickText(page, text, selector = 'button') {
  const found = await page.evaluate((text, selector) => {
    const target = [...document.querySelectorAll(selector)]
      .find(node => node.textContent?.trim().includes(text));
    if (!target) return false;
    target.click(); return true;
  }, text, selector);
  assert.ok(found, 'Expected clickable ' + text);
}
async function start(page, scenario) {
  await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 25000 });
  await contains(page, 'Choose a business');
  if (scenario !== 'success') {
    await page.select('aside select', scenario);
    await contains(page, 'Choose a business');
  }
  await clickText(page, 'Synthetic business');
  await contains(page, 'Membership:');
  await contains(page, 'Synthetic action-0');
  return await page.$eval('.panel-heading', x => x.innerText);
}
async function inputNative(page, selector, value) {
  await page.$eval(selector, (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function recoveryDraft(page) {
  await page.$eval('details.action-source > summary', x => x.click());
  await page.type('input[aria-label="Recovery amount for Synthetic action-0"]', '25.00');
  await inputNative(page, 'details.action-source input[type="date"]', '2026-09-30');
  await page.type('details.action-source input[maxlength="1000"]', 'Synthetic confirmed by fixture only');
  await contains(page, 'Unsaved entry');
}
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message));

  assert.match(await start(page, 'success'), /editor/);
  passed('verified synthetic sign-in, editor membership and action rendering');
  await clickText(page, 'Next');
  await contains(page, 'Synthetic action-100');
  await clickText(page, 'Previous');
  await contains(page, 'Synthetic action-0');
  passed('action list pagination');
  await recoveryDraft(page);
  await clickText(page, 'Probe unload handler');
  await contains(page, 'Unload: Protected');
  passed('dirty recovery warns on browser unload');
  await clickText(page, '← PROFITLEAKLAB DEMO', 'a');
  await contains(page, 'Confirmation:');
  assert.match(await page.$eval('aside output', e => e.innerText), /unsaved|leave|discard/i);
  passed('dirty recovery blocks unsafe navigation');
  await clickText(page, 'Save reported recovery');
  await contains(page, 'Reported recovery saved.');
  await clickText(page, 'Inspect synthetic writes');
  await contains(page, 'Synthetic writes: 1');
  passed('synthetic recovery save uses a single write');
  await clickText(page, 'Probe unload handler');
  await contains(page, 'Unload: Clean');
  passed('saved recovery clears unload warning');

  assert.match(await start(page, 'viewer'), /viewer/);
  assert.ok(!(await page.$eval('body', e => e.innerText)).includes('Record or correct reported recovery'));
  assert.ok(!(await page.$eval('body', e => e.innerText)).includes('New action'));
  passed('viewer cannot access editing or recovery controls');
  await clickText(page, 'Simulate remote access loss');
  await contains(page, 'Sign in to the pilot');
  assert.ok(!(await page.$eval('body', e => e.innerText)).includes('Synthetic action-0'));
  passed('revocation immediately clears financial action cards');

  for (const scenario of ['conflict', 'uncertain']) {
    const scenarioPage = await browser.newPage();
    scenarioPage.on('pageerror', e => errors.push(e.message));
    assert.match(await start(scenarioPage, scenario), /editor/);
    await recoveryDraft(scenarioPage);
    await clickText(scenarioPage, 'Save reported recovery');
    await contains(scenarioPage, 'Check the recovery before another change');
    await clickText(scenarioPage, 'Inspect synthetic writes');
    await contains(scenarioPage, 'Synthetic writes: 1');
    await clickText(scenarioPage, 'Load current recovery');
    await contains(scenarioPage, 'Current saved record');
    await clickText(scenarioPage, 'I reviewed this; use current record');
    await clickText(scenarioPage, 'Inspect synthetic writes');
    await contains(scenarioPage, 'Synthetic writes: 1');
    passed(scenario + ' recovery requires explicit review and does not replay writes');
  }
  assert.deepEqual(errors, []);
  passed('no uncaught browser errors in synthetic scenarios');
} finally {
  await browser.close();
  vite?.kill();
}
console.log('Synthetic browser acceptance passed:', successes, 'checks. Not a live Supabase test.');
