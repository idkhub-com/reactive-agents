# Contributing to Super Agents

Thank you for your interest in improving **Super Agents**!

## Project Structure

This is a TypeScript monorepo using pnpm workspaces with three packages:

```
packages/
├── api/           # Hono API server (Node.js)
│   └── src/
│       ├── ai-providers/  # AI provider integrations (40+)
│       ├── connectors/    # Database connectors
│       ├── middlewares/   # Hono middlewares
│       └── v1/            # API routes
├── shared/        # Shared types, Zod schemas, utilities
│   └── src/
│       ├── types/         # TypeScript types
│       └── utils/         # Shared utilities
└── web/           # Vite + TanStack Router SPA (React 19)
    └── src/
        ├── api/           # API client functions
        ├── components/    # React components
        ├── hooks/         # Custom React hooks
        ├── providers/     # React context providers
        └── routes/        # TanStack Router file-based routes
```

Other directories:
- `examples/`: Example implementations
- `supabase/`: Local dev DB config, migrations, `seed.sql`
- `docker/`: Docker configuration files

**Path aliases:** Use `@web/*`, `@api/*`, `@shared/*` for imports.

## Setup

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Start the local services:
   ```sh
   supabase start
   ```
3. Install dependencies:
   ```sh
   pnpm install
   ```
4. Run the development server:
   ```sh
   pnpm dev
   ```

To run without Supabase (and without Docker), build once and start the same
single process the published image runs, backed by an embedded libSQL file:

```sh
pnpm build
LIBSQL_URL="file:$PWD/.data/dev.db" DASHBOARD_ROOT=./packages/web/dist \
  node packages/api/dist/server.js
```

The dashboard and the API are then both on `http://localhost:3000`. Note that
this is a build-and-run loop, not hot reload — `pnpm dev` remains the way to
iterate. It is also the only way to exercise a `file:` database locally, since
`pnpm dev:api` runs on workerd, where `@libsql/client` is HTTP-only.

## Development Commands

**Build & Run:**
```sh
pnpm build          # Build all packages (uses Turborepo)
pnpm build:web      # Build only web package
pnpm build:api      # Build only API package
pnpm dev            # Start all dev servers in parallel
pnpm dev:web        # Start only web dev server (Vite on port 3000)
pnpm dev:api        # Start only API dev server (Hono on port 8787)
pnpm start          # Serve production build
```

**Code Quality:**
```sh
pnpm check          # Run Biome linting and formatting checks
pnpm check:fix      # Auto-fix linting and formatting issues
pnpm lint           # Run linter
pnpm format         # Check code formatting
pnpm format:fix     # Auto-fix formatting
pnpm typecheck      # TypeScript type checking (uses Turborepo)
```

**Testing:**
```sh
pnpm test           # Run all tests (CI mode)
pnpm test:watch     # Run tests in watch mode
pnpm test path/to/test.ts  # Run specific test file

pnpm exec playwright install chromium  # first run only
pnpm test:e2e       # End-to-end: build, then drive the real server in a browser
pnpm test:e2e:ui    # End-to-end in Playwright's interactive runner
```

The end-to-end suite (`e2e/`) runs the built app against an embedded libSQL
database, so it needs no Supabase and no Docker — see `e2e/README.md`.

**Database:**
```sh
supabase start      # Start local Supabase
supabase stop       # Stop local Supabase
```

## Coding Style & Conventions

**Language & Framework:**
- TypeScript, React 19, Vite, TanStack Router
- 2-space indent, LF line endings, single quotes, semicolons
- Biome handles formatting and import organization

**File Naming:**
- Use kebab-case for filenames (e.g., `add-logs-dialog.tsx`)
- Components: PascalCase exports
- Tests: `*.test.ts` or `*.test.tsx`, colocated with source files

**Module Organization:**
- Prefer path aliases (`@web/*`, `@api/*`, `@shared/*`) over relative imports
- Colocate simple hooks/utils with features

## Testing Guidelines

- **Framework:** Vitest (jsdom) + Testing Library
- **Location:** Tests are colocated with source files in each package
  - Example: `packages/api/src/v1/super-agents/agents.test.ts`
  - Example: `packages/web/src/hooks/use-smart-back.test.ts`
- **Coverage:** Reports generated in text/json/html; maintain meaningful coverage for changed code
- **Run tests:** `pnpm test` (CI) or `pnpm test:watch` (development)

## Before Pushing

Always run these commands before pushing:
```sh
pnpm typecheck && pnpm check && pnpm test
```

## Pull Requests

- Create a feature branch for your work
- Use [conventional commits](https://www.conventionalcommits.org/):
  - `feat(api): add feedback endpoint`
  - `fix(web): handle empty dataset state`
  - `docs: improve contributing guide`
- Include in your PR:
  - Problem/solution summary
  - Linked issues
  - Screenshots for UI changes
  - Test notes
  - Any schema/migration callouts
- Ensure changes include tests and documentation when appropriate

## Agent Validation & Readiness

When working on agent or skill functionality, be aware of the validation requirements:

**Agent Requirements:**
- All agents must have at least one skill configured to be considered "ready"

**Skill Requirements:**
- At least one model must be configured
- If optimization is enabled, at least one evaluation must be configured

**UI Indicators:**
- Agents/skills without requirements display an orange indicator icon or badge
- Detail views show warning banners for incomplete agents/skills
- Popover tooltips explain what requirements are missing

**Validation Logic:**
- Agent validation: `packages/shared/src/utils/agent-validation.ts`
- Skill validation: `packages/shared/src/utils/skill-validation.ts`

**Reusable Components:**
- `AgentStatusIndicator` (`packages/web/src/components/agents/agent-status-indicator.tsx`)
- `SkillStatusIndicator` (`packages/web/src/components/agents/skills/skill-status-indicator.tsx`)

**User Experience:**
- Guide users to add required components when viewing incomplete agents/skills

## Security & Configuration

- **Secrets:** Never commit secrets; use `.env` for local development
- **Supabase:** Migrations go in `supabase/migrations/`; seed data in `supabase/seed.sql`
- **API/Middleware changes:** Include server/client tests and update docs when relevant

We appreciate your contributions!
