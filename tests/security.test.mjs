import test from 'node:test';
import assert from 'node:assert/strict';
import { secureResponse } from '../core/security.mjs';
test('HTML response boundary applies CSP and disables caching', async () => {
  const res = secureResponse(new Response('<html>Demo</html>', { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public' } }));
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.equal(res.headers.get('X-Frame-Options'), 'DENY');
  assert.match(res.headers.get('Content-Security-Policy'), /object-src 'none'/);
  assert.equal(await res.text(), '<html>Demo</html>');
});
test('static asset caching and error status are preserved', () => {
  const res = secureResponse(new Response('missing', { status: 404, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'max-age=60' } }));
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('Cache-Control'), 'max-age=60');
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
});
