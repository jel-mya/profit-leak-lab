# ProfitLeakLab — Trade Financial Control

Canonical repository: [jel-mya/profit-leak-lab](https://github.com/jel-mya/profit-leak-lab).

A working financial exception review application for trade businesses. Includes job profitability, debtor ageing/risk, potential duplicate supplier payments, labour variance, a financial-control checklist, action tracking and an auditable money-requiring-investigation dashboard.

## Run

Node 22.13+ and npm are required.

```sh
npm ci
npm ci --prefix frontend
npm test
npm --prefix frontend run lint
npm run dev
```

Open the URL printed by the development server. `npm run build` produces a Cloudflare Worker and assets in `frontend/dist/`; `npm --prefix frontend start` serves the production build locally. CI runs tests, application lint/type analysis and the production build. Vendored Shadcn primitives are excluded from application lint; their original source is preserved.

`npm test` includes executable PostgreSQL tenant-isolation tests. Run just those with `npm run test:db`. They load every migration in filename order into an ephemeral PGlite database, exercise real grants/RLS using non-superuser roles, and discard all synthetic records on exit. They require no Supabase account, credentials, Docker or database files. See [database test scope](docs/architecture.md#database-security-tests).

## Use

The initial dataset is explicitly fictional, fixed at 6 September 2026. It shows A$11,450 requiring investigation: A$10,200 overdue receivables plus A$1,250 potential extra supplier payments. A$1,600 labour variance is shown separately to avoid adding overlapping job costs.

Choose an as-of date, a single currency and target margin. Review each control and use **Track** to create follow-up actions with an owner, due date, status and evidence note. Tracked financial findings retain source IDs, the original review amount/currency/date and a link back to their section. Reimported sources or changed review settings are flagged for review again. Add an evidence/outcome note before resolving or dismissing an action. Download the action record before refreshing.

Under **Import**, download the appropriate blank CSV template and choose jobs, debtors, payments or labour. Match each required field to a source column (exact template names are preselected), validate the mapping, then review the record count and first five rows and apply or cancel. Unselected columns are excluded. Choosing a file does not change current records. The first applied import removes all demo data. Every subsequent import replaces its section, never silently appends. Failed imports preserve the previous data. A header-only file explicitly clears its section. Limits: 2 MB and 10,000 rows per file; unique non-empty headers (up to 100 columns), one source column per required field, unique IDs, ISO dates and non-negative amounts with at most two decimal places. Review tables show 50 records per page; totals include every record. No tax/currency conversion. Do not mix currencies or inconsistent tax bases.

Data is processed in browser memory and not uploaded or persisted. Refreshing clears imports, checklist answers and actions. Downloads stay on your device and may contain sensitive information; they never belong in Git. The separate `/workspace` route supports an opt-in authenticated action workspace. It is disabled by default; no live accounting connectors, billing or payment actions are enabled.

## Deploy and persistence

Cloudflare-compatible Worker build: deploy `frontend/dist/server/wrangler.json` with Wrangler after configuring your own approved Cloudflare project. Do not deploy the development server. The optional Sites preview uses the non-secret project metadata in `frontend/.openai/hosting.json`; GitHub remains canonical. Hosting source mirrors must contain the exact canonical commit and must not become a second development codebase.

Supabase SQL is in `supabase/migrations/`. It supplies tenant isolation and least-privilege action tables; it does not create an account or connect the application. See [workspace configuration](docs/workspace-client.md) before enabling the pilot. Copy `.env.example` only to an ignored environment file. Never add a Supabase service-role key to frontend environment variables.

Prepare actual API verification with the [live Supabase checks](docs/live-supabase-checks.md).

Read [strategy](config.md), [architecture/security](docs/architecture.md) and [delivery backlog](docs/backlog.md). Production customer-data storage is gated on live RLS verification, authentication, audit history and operational/privacy controls.
