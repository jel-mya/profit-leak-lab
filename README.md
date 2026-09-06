# ProfitLeakLab — Trade Financial Control

Canonical repository: [jel-mya/profit-leak-lab](https://github.com/jel-mya/profit-leak-lab).

A working financial exception review application for trade businesses. Includes job profitability, debtor ageing/risk, potential duplicate supplier payments, labour variance, a financial-control checklist, action tracking and an auditable money-requiring-investigation dashboard.

## Run

Node 22.13+ and npm are required.

```sh
npm ci --prefix frontend
npm test
npm --prefix frontend run lint
npm run dev
```

Open the URL printed by the development server. `npm run build` produces a Cloudflare Worker and assets in `frontend/dist/`; `npm --prefix frontend start` serves the production build locally. CI runs tests, application lint/type analysis and the production build. Vendored Shadcn primitives are excluded from application lint; their original source is preserved.

## Use

The initial dataset is explicitly fictional, fixed at 6 September 2026. It shows A$11,450 requiring investigation: A$10,200 overdue receivables plus A$1,250 potential extra supplier payments. A$1,600 labour variance is shown separately to avoid adding overlapping job costs.

Choose an as-of date, a single currency and target margin. Review each control and use **Track** to create follow-up actions with an owner, due date, status and evidence note. Download the action record before refreshing.

Under **Import**, download the appropriate blank CSV template and load jobs, debtors, payments or labour. The first successful import removes all demo data. Every subsequent import replaces its section, never silently appends. Failed imports preserve the previous data. A header-only file explicitly clears its section. Limits: 2 MB and 10,000 rows per file; exact headers, unique IDs, ISO dates and non-negative amounts with at most two decimal places. No tax/currency conversion. Do not mix currencies or inconsistent tax bases.

Data is processed in browser memory and not uploaded or persisted. Refreshing clears imports, checklist answers and actions. Downloads stay on your device and may contain sensitive information; they never belong in Git. No live accounting connectors, authentication, billing, cloud data persistence or payment actions are enabled in this release.

## Deploy and persistence

Cloudflare-compatible Worker build: deploy `frontend/dist/server/wrangler.json` with Wrangler after configuring your own approved Cloudflare project. Do not deploy the development server. The optional Sites preview uses the non-secret project metadata in `frontend/.openai/hosting.json`; GitHub remains canonical. Hosting source mirrors must contain the exact canonical commit and must not become a second development codebase.

Supabase SQL is in `supabase/migrations/`. It supplies tenant isolation and least-privilege action tables; it does not create an account or connect the application. Copy `.env.example` to an ignored environment file only when implementing authenticated persistence. Never add a Supabase service-role key to frontend environment variables.

Read [strategy](config.md), [architecture/security](docs/architecture.md) and [delivery backlog](docs/backlog.md). Production customer-data storage is gated on live RLS verification, authentication, audit history and operational/privacy controls.
