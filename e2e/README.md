# End-to-end tests

Playwright tests that drive the real application: the built Hono server against
a real database, with a real browser against the built dashboard. The storage
contract runs twice — once per backend — so the libSQL and Supabase connectors
are held to the same behaviour.

```sh
pnpm test:e2e          # build, then run against libSQL (no containers needed)
pnpm test:e2e:all      # the above, plus the contract specs against Supabase
pnpm test:e2e:ui       # interactive runner (skips the build)
pnpm test:e2e:report   # open the report from the last run
```

`test:e2e:all` needs a container runtime — it starts Postgres and PostgREST
through `scripts/e2e-postgres.sh`, which works with either `docker compose` or
`podman compose`. Stop them again with `pnpm test:e2e:postgres down`.

First run only:

```sh
pnpm exec playwright install chromium
```

## What this covers that the unit tests don't

The Vitest suites mock the storage connector and render components in jsdom, so
several seams have no coverage there by construction:

- **Static serving and the SPA fallback.** Both live in `server.ts` and run in
  neither `pnpm dev` (Vite serves the dashboard) nor the unit tests.
- **The `/v1` 404 boundary.** `commonVariablesMiddleware` skips
  `/v1/super-agents/*`, so without the explicit guard that subtree would answer
  a mistyped endpoint with `index.html` and a 200.
- **The libSQL backend as it actually ships.** The bundle leaves `libsql`
  external because of its native addon, migrations run on the first request,
  and Zod schemas round-trip through real HTTP rather than a test client.
- **The dashboard against a real API**, including that it renders without
  console errors — a React crash still returns HTTP 200.

Constraint translation is one concrete example: a duplicate agent name returned
`500` on libSQL until these tests ran, because `parseDatabaseError` only knew
PostgreSQL's lowercase `unique constraint` and SQLite shouts `UNIQUE constraint
failed`.

## How it runs

`scripts/start-e2e-server.mjs` boots `packages/api/dist/server.js` — the same
single process the published image runs — pointed at a throwaway libSQL file
under `.e2e-data/`. Migrations run on the first request, so deleting the file
is a full reset, and that half of the suite needs no Postgres, no PostgREST and
no container runtime at all. Only the Supabase parity pass does.

It has to be the built server rather than `pnpm dev`: `pnpm dev:api` runs
wrangler, and on workerd `@libsql/client` resolves to its HTTP-only build, so
an embedded database cannot be opened there at all.

Three servers run, because two things are fixed per process and decided from
the environment — the storage backend and whether the dashboard needs a login:

| Project             | Port | Backend  | Covers                              |
| ------------------- | ---- | -------- | ----------------------------------- |
| `api`               | 3100 | libSQL   | server shape: routing, SPA fallback, headers |
| `contract:libsql`   | 3100 | libSQL   | the storage contract                |
| `contract:supabase` | 3102 | Supabase | the same specs, other connector     |
| `dashboard`         | 3100 | libSQL   | the dashboard in Chromium           |
| `auth`              | 3101 | libSQL   | the login flow                      |

Neither `api` nor the two `contract` projects launches a browser — they use
Playwright's `request` fixture only, which is what keeps the whole suite at a
few seconds.

## The parity pass

`e2e/contract/` is the directory that runs twice, once per storage backend.
That is the highest-value part of this suite. libSQL and Supabase are two
implementations of one interface, and Postgres and SQLite disagree about nearly
every type the schema uses — `JSONB`, `TIMESTAMPTZ`, `BOOLEAN`, `TEXT[]` and
`FLOAT[]` all collapse onto TEXT/INTEGER/REAL, and `connectors/libsql/rows.ts`
converts them back by hand.

`types.spec.ts` exercises exactly those conversions: JSON round-trips, booleans
(including `false`), floats, string arrays (including empty), NULL staying
`null` rather than becoming `undefined`, `updated_at` advancing past its AFTER
UPDATE trigger, and `ON DELETE CASCADE` firing — which on SQLite depends on
`PRAGMA foreign_keys = ON` being set per connection.

Running one suite against both connectors is what proves the translation is
faithful rather than merely self-consistent. A test that only ever runs against
libSQL cannot tell the difference.

When `E2E_POSTGREST_URL` is unset the Supabase project is not registered, and
the config says so on stderr rather than skipping quietly.

## Writing tests

Agent names are unique across a deployment and the projects run in parallel, so
coin one per test with `uniqueAgentName()` from `fixtures/agents.ts` rather than
sharing a fixture row. Locally the servers are reused between runs
(`reuseExistingServer`), so no test may assume an empty database; CI always
boots its own. The Supabase database is not reset between runs either, which is
the same constraint from the other direction.

Put a spec in `contract/` when it is about what the storage layer must do, and
in `api/` when it is about the server's own shape. Anything in `contract/` runs
against both backends, so it must not assume a particular one.

Clean up through `deleteAgent()` in a `finally` block — it swallows its own
failures so a teardown error can't mask the real assertion.
