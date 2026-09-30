import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import CloudWorkspace from '../../frontend/app/workspace/page';
import { configure, revoke, writes } from './fixture';
window.fetch = async () => new Response(JSON.stringify({ config: { url: 'https://synthetic.supabase.co', publishableKey: 'sb_publishable_SYNTHETIC_FIXTURE_ONLY_0000' } }));
let allowLeave = false;
window.confirm = message => { window.dispatchEvent(new CustomEvent('fixture-confirm', { detail: message })); return allowLeave; };
function Fixture() {
  const [key, setKey] = useState(0);
  const [count, setCount] = useState(0);
  const [warning, setWarning] = useState('No confirmation');
  const [unload, setUnload] = useState('Untested');
  React.useEffect(() => { const receive = event => setWarning(event.detail); window.addEventListener('fixture-confirm', receive); return () => window.removeEventListener('fixture-confirm', receive); }, []);
  return <><aside><h1>ProfitLeakLab synthetic acceptance fixture</h1><label>Allow navigation <input type="checkbox" onChange={event => { allowLeave = event.target.checked; }}/></label><button onClick={() => setWarning('No confirmation')}>Clear confirmation log</button><output>Confirmation: {warning}</output><button onClick={() => { const event = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(event); setUnload(event.defaultPrevented ? 'Protected' : 'Clean'); }}>Probe unload handler</button><output>Unload: {unload}</output><label>Scenario <select onChange={event => { configure(event.target.value); setKey(key + 1); }}><option value="success">Success</option><option value="conflict">Conflict</option><option value="uncertain">Uncertain</option><option value="viewer">Viewer</option></select></label><button onClick={() => { revoke(); }}>Simulate remote access loss</button><button onClick={() => setCount(writes)}>Inspect synthetic writes</button><output>Synthetic writes: {count}</output><button onClick={() => setKey(key + 1)}>Reset fixture</button></aside><CloudWorkspace key={key}/></>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
