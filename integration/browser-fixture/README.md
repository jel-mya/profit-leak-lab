# Optional synthetic workspace browser acceptance

This fixture mounts the **actual** `frontend/app/workspace/page.tsx` React component against a simulated, in-memory Supabase Auth/port, then drives a real headless Chromium browser. It does not contact Supabase, contain customer records, open the production sign-in route, accept credentials or make any accounting writes.

## Run locally

Requires Node 22.13+, repository and frontend dependencies installed with `npm ci`, a locally available Chrome/Chromium browser and locally installed **Puppeteer**. To keep production dependencies unchanged, this optional harness does **not** add Puppeteer to either lock file.

Set `PUPPETEER_MODULE` to a local Puppeteer package directory if Puppeteer is not otherwise resolvable. On nonstandard Chrome installations, set `CHROME_PATH` to the executable. Then run:

```sh
npm run test:browser:pilot
```

The runner automatically starts/stops a Vite fixture on `127.0.0.1:8794` with strict port selection, opens Chromium and returns a nonzero exit code if an assertion fails. If a suitable fixture is already running, set `PILOT_FIXTURE_URL` to its loopback URL to skip automatic server startup. Never point this variable at a production workspace.

## Covered synthetic scenarios

The 11 browser assertions cover verified simulated sign-in and editor membership; action rendering and page navigation; warning on unsaved recovery; cancelling unsafe navigation; a single reported-recovery write and removal of the unload warning after save; viewer controls; access-revocation clearing; conflict and uncertain-save review without automatic replay; and absence of uncaught browser errors.

The previous one-off run114 fixture was promoted into the reusable repository harness. Its simulated credentials are deliberately invalid/non-live and all its financial records are invented. The browser exercises the real React components but **not** real Supabase sign-in, PostgREST, deployed CSP, simultaneous client contention, storage persistence or a commercial release. Those still require the separate [connected pilot live checks](../../docs/pilot-readiness.md).
