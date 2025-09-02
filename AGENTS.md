# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js routes (RSC), layouts, page entries.
- `lib/`: Shared code
  - `lib/client/`, `lib/server/`, `lib/shared/`
- `tests/`: Vitest suites mirroring app/lib (client, server, shared).
- `public/`: Static assets.  `docs/`, `examples/`, `scripts/`.
- `supabase/`: Local dev DB config, migrations, `seed.sql`.
- Key aliases: `@client`, `@server`, `@shared`.

## Build, Test, and Development Commands
- Install: `pnpm install`
- Local DB: `supabase start`
- Dev server: `pnpm dev` (Next.js + Turbopack)
- Build/serve: `pnpm build` → `pnpm start`
- Lint/format: `pnpm lint`, `pnpm format`, `pnpm check`, `pnpm check:fix`
- Types/tests: `pnpm typecheck`, `pnpm test`, `pnpm test:watch`
- Cloudflare (OpenNext): `pnpm cf-build`, `pnpm preview`, `pnpm deploy`

## Coding Style & Naming Conventions
- Language: TypeScript, React 19, Next.js 15.
- Formatting via Biome: 2-space indent, LF, single quotes, semicolons, import organize.
  - Auto-fix: `pnpm check:fix` or `pnpm format:fix`.
- Files: kebab-case for filenames (e.g., `add-logs-dialog.tsx`).
- Components: PascalCase exports; colocate simple hooks/utils with feature or place in `lib/*`.
- Paths: prefer `@client`, `@server`, `@shared` over long relatives.

## Testing Guidelines
- Framework: Vitest (jsdom) + Testing Library.
- Location: under `tests/` mirroring source paths (e.g., `tests/server/api/v1/idk/agents.test.ts`).
- Naming: `*.test.ts` or `*.test.tsx`; use `*.spec.*` if useful.
- Run: `pnpm test` (CI mode) or `pnpm test:watch` (dev). Coverage reports (text/json/html) are generated; keep meaningful coverage for changed code.

## Commit & Pull Request Guidelines
- Conventional Commits required. Examples:
  - `feat(server): add feedback endpoint`
  - `fix(client): handle empty dataset state`
- Before pushing: `pnpm typecheck && pnpm check && pnpm test`.
- PRs include: problem/solution summary, linked issues, screenshots for UI, test notes, and any schema/migration callouts.

## Security & Configuration Tips
- Secrets: never commit; use `.env` for local. Regenerate CF types with `pnpm cf-typegen` when env changes.
- Supabase: start/stop with `supabase start|stop`; migrations in `supabase/migrations` and seed via `supabase/seed.sql`.
- Middleware and API changes should include server/client tests and docs updates in `docs/` when relevant.

