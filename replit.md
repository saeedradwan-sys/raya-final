# RAYA Customs

Jordan customs brokerage platform: tariff/HS lookup, container tracking, ASYCUDA declaration workflow (simulation), client portal, and staff operations tools. Imported from github.com/saeedradwan-sys/raya-customs into `artifacts/raya-customs`.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/raya-customs/src` — React frontend (react-router-dom, Tailwind v4, custom dark theme in `src/styles`)
- `artifacts/raya-customs/server` — self-contained Node http API (`index.mjs`, JWT auth, tariff, tracking, ASYCUDA sim); NOT the shared api-server
- `artifacts/raya-customs/db/migrations` — raw SQL migrations, applied via `pnpm --filter @workspace/raya-customs run db:migrate`

## Architecture decisions

- The raya-customs artifact keeps its original standalone backend instead of the shared api-server/OpenAPI flow; frontend and API run in ONE workflow (`dev` script starts both).
- Browser calls `/rapi/*` (baked in via Vite `define` of `VITE_API_BASE`); Vite dev proxy rewrites `/rapi` → `/api` to `127.0.0.1:8787`, because the shared proxy owns `/api` for the workspace api-server.
- Backend persistence uses the built-in Postgres via `RAYA_DATABASE_URL=$DATABASE_URL` (set in the package scripts); without it the server silently falls back to memory/jsonl stores.
- `src/lib/tracking/adapters.ts` and `src/data/codification/*.json` were reconstructed — the GitHub snapshot never committed them.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
