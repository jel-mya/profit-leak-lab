import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceConfig } from '../core/workspace-config.mjs';
import { contentSecurityPolicy } from '../core/security.mjs';
const settings = { CLOUD_WORKSPACE_ENABLED: 'true', SUPABASE_URL: 'https://synthetic-project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_public_fixture_only' };
test('workspace configuration defaults off and returns only public settings', () => {
  assert.equal(workspaceConfig({}), null);
  assert.equal(workspaceConfig({ ...settings, CLOUD_WORKSPACE_ENABLED: 'false' }), null);
  assert.deepEqual(workspaceConfig({ ...settings, PRIVATE_FIELD: 'not-for-browser' }), { url: settings.SUPABASE_URL, publishableKey: settings.SUPABASE_PUBLISHABLE_KEY });
});
test('workspace configuration rejects non-project URLs and non-publishable credentials', () => {
  for (const url of ['http://example.supabase.co', 'https://evil.test', 'https://example.supabase.co/path', 'https://example.supabase.co@evil.test']) assert.equal(workspaceConfig({ ...settings, SUPABASE_URL: url }), null);
  for (const key of ['', 'legacy-jwt-not-accepted', 'service-role-not-accepted']) assert.equal(workspaceConfig({ ...settings, SUPABASE_PUBLISHABLE_KEY: key }), null);
});
test('CSP permits only the configured project and nonce-bearing inline scripts', () => {
  const nonce = 'abcdefghijklmnopqrstuvwx';
  const csp = contentSecurityPolicy(nonce, settings.SUPABASE_URL);
  assert.match(csp, /script-src 'self' 'nonce-abcdefghijklmnopqrstuvwx'/);
  assert.ok(!csp.split(';').find(v => v.trim().startsWith('script-src')).includes('unsafe-inline'));
  assert.match(csp, /connect-src 'self' https:\/\/synthetic-project.supabase.co;/);
  assert.throws(() => contentSecurityPolicy("' invalid nonce"));
  assert.throws(() => contentSecurityPolicy(nonce, "https://evil.test; script-src *"));
});
