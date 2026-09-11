import assert from 'node:assert/strict';
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:8791');
assert.equal(base.protocol, 'http:');
assert.equal(base.hostname, '127.0.0.1', 'Only loopback smoke targets are allowed');
assert.equal(base.username + base.password + base.search + base.hash, '');
const nonces = new Set();
for (const route of ['/', '/workspace', '/']) {
  const response = await fetch(new URL(route, base), { signal: AbortSignal.timeout(15000), redirect: 'error' });
  assert.equal(response.status, 200, 'Route failed');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const csp = response.headers.get('content-security-policy') ?? '';
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, 'Missing CSP nonce');
  assert.ok(!nonces.has(nonce), 'Nonce reused across responses');
  nonces.add(nonce);
  assert.ok(csp.includes("frame-ancestors 'none'"));
  const html = await response.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
  assert.ok(scripts.length > 0, 'Missing hydration scripts');
  assert.ok(scripts.every(script => script.includes(`nonce="${nonce}"`)), 'Script nonce does not match response policy');
}
const config = await fetch(new URL('/api/workspace-config', base), { signal: AbortSignal.timeout(15000), redirect: 'error' });
assert.equal(config.status, 200);
assert.equal(config.headers.get('cache-control'), 'no-store');
assert.deepEqual(await config.json(), { config: null }, 'Smoke requires the default disabled workspace');
console.log('Local production HTTP smoke passed: routes, fresh script nonces, security headers and disabled workspace. Not browser interaction verification.');
