import { randomUUID } from 'node:crypto';
import { verifyWriteIsolation } from './supabase-write-checks.mjs';
import { verifyRecoveryIsolation } from './supabase-recovery-checks.mjs';
import { createRequire } from 'node:module';
import { workspaceConfig } from '../core/workspace-config.mjs';
import { verifyReadIsolation } from './supabase-read-checks.mjs';

const writes = process.argv.includes('--writes');
const writeAuthorised = !writes || process.env.SUPABASE_LIVE_WRITE_CONFIRM === 'APPEND_SYNTHETIC_HISTORY';
const required = ['LIVE_OWNER_A_EMAIL', 'LIVE_OWNER_A_PASSWORD', 'LIVE_OWNER_B_EMAIL', 'LIVE_OWNER_B_PASSWORD', 'LIVE_VIEWER_A_EMAIL', 'LIVE_VIEWER_A_PASSWORD', 'LIVE_BUSINESS_A_ID', 'LIVE_ACTION_A_ID', 'LIVE_BUSINESS_B_ID', 'LIVE_ACTION_B_ID'];
const config = workspaceConfig({ ...process.env, CLOUD_WORKSPACE_ENABLED: 'true' });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!writeAuthorised || process.argv.slice(2).some(arg => arg !== '--writes') || process.env.SUPABASE_LIVE_TEST_CONFIRM !== 'SYNTHETIC_ONLY' || !config || required.some(key => !process.env[key]) || required.filter(key => key.endsWith('_ID')).some(key => !uuid.test(process.env[key]))) {
  console.error('Live checks not run: provide a disposable synthetic project and all documented environment settings. See docs/live-supabase-checks.md.');
  process.exitCode = 1;
} else {
  const require = createRequire(new URL('../frontend/package.json', import.meta.url));
  const { createClient } = require('@supabase/supabase-js');
  const clients = [];
  try {
    const options = { global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
    for (const label of ['OWNER_A', 'OWNER_B', 'VIEWER_A']) {
      const client = createClient(config.url, config.publishableKey, options);
      clients.push(client);
      const result = await client.auth.signInWithPassword({ email: process.env[`LIVE_${label}_EMAIL`], password: process.env[`LIVE_${label}_PASSWORD`] });
      if (result.error) throw new Error('Authentication failed');
    }
    const anonymous = createClient(config.url, config.publishableKey, options);
    await verifyReadIsolation({ users: clients, anonymous }, {
      a: { business: process.env.LIVE_BUSINESS_A_ID, action: process.env.LIVE_ACTION_A_ID },
      b: { business: process.env.LIVE_BUSINESS_B_ID, action: process.env.LIVE_ACTION_B_ID },
    }, message => console.log(`PASS: ${message}`));
    if (writes) {
      const action = await verifyWriteIsolation({ users: clients, anonymous }, process.env.LIVE_BUSINESS_A_ID, randomUUID(), message => console.log('PASS: ' + message));
      const business = await clients[0].from('businesses').select('currency').eq('id', process.env.LIVE_BUSINESS_A_ID).single();
      if (business.error) throw new Error('Synthetic business currency unavailable');
      await verifyRecoveryIsolation({ users: clients, anonymous }, action, business.data?.currency, message => console.log('PASS: ' + message));
      console.log('Live read/write checks passed. Synthetic records remain. Revocation, expiry, onboarding concurrency and browser/operational checks remain separate gates.');
    } else console.log('Live read isolation passed. Write permissions, concurrency, revocation and browser flows are still separate release gates.');
  } catch {
    // Never print SDK exceptions, fixture values, credentials or server payloads.
    console.error(writes ? 'Live verification failed. Synthetic test actions/history may remain; inspect the disposable project privately.' : 'Live read isolation failed. Check synthetic fixture provisioning and project configuration privately. No financial writes were attempted.');
    process.exitCode = 1;
  } finally {
    for (const client of clients) {
      try { const result = await client.auth.signOut({ scope: 'local' }); if (result.error) throw new Error(); }
      catch { console.error('Test-session sign-out failed; revoke disposable test sessions manually.'); process.exitCode = 1; }
    }
  }
}
