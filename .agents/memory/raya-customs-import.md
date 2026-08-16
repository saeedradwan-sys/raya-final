---
name: RAYA Customs import quirks
description: Non-obvious constraints from importing the raya-customs GitHub repo into the workspace
---

- The GitHub snapshot (single grafted commit) omitted files its own code imports: `src/lib/tracking/adapters.ts` and `src/data/codification/*.json`. These were reconstructed from usage; if the user re-syncs from GitHub, don't overwrite them blindly.
  **Why:** repo history was squashed to a "clean snapshot" that dropped untracked/generated files.
- The artifact runs its own Node backend on 127.0.0.1:8787 inside the same workflow as Vite. Frontend must call `/rapi/*` (Vite proxy rewrites to `/api`) because the shared workspace proxy owns `/api` for the shared api-server.
  **How to apply:** any new frontend fetch paths must go through `API_BASE` (`/rapi`), never hardcode `/api`. A production static build has no Vite proxy — deployment needs its own routing solution.
- Server env contract: `RAYA_DATABASE_URL` (not DATABASE_URL), `RAYA_JWT_SECRET`, `CORS_ORIGIN`; production/private mode fails closed without strong values. Dev mode allows demo auth.
- Production must NOT publish static-only: the frontend depends on `/rapi/*` reaching its own API, so the artifact's production topology has to run the API alongside the built frontend.
  **Why:** a static publish silently breaks every sign-in/tracking/portal call; the JWT secret is deterministically derived from `SESSION_SECRET` when unset so tokens survive restarts.
- Audit writes require a resolvable organization; audits for anonymous/failed logins must be best-effort or they turn 401s into 500s in production.
