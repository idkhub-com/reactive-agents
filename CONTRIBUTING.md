# Contributing to Reactive Agents

Thank you for your interest in improving **Reactive Agents**!

## Project Structure

- `app/`: Next.js routes (RSC), layouts, page entries
- `lib/`: Shared code organized into `lib/client/`, `lib/server/`, `lib/shared/`
- `tests/`: Vitest suites mirroring app/lib (client, server, shared)
- `public/`: Static assets
- `docs/`, `examples/`, `scripts/`: Documentation and utilities
- `supabase/`: Local dev DB config, migrations, `seed.sql`
- Path aliases: Use `@client`, `@server`, `@shared` for imports

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

## Development Commands

**Build & Run:**
```sh
pnpm build          # Build for production
pnpm start          # Serve production build
pnpm dev            # Start dev server (Next.js + Turbopack)
```

**Code Quality:**
```sh
pnpm check          # Run Biome linting and formatting checks
pnpm check:fix      # Auto-fix linting and formatting issues
pnpm lint           # Run linter
pnpm format         # Check code formatting
pnpm format:fix     # Auto-fix formatting
pnpm typecheck      # TypeScript type checking
```

**Testing:**
```sh
pnpm test           # Run all tests (CI mode)
pnpm test:watch     # Run tests in watch mode
pnpm test path/to/test.ts  # Run specific test file
```

**Cloudflare (OpenNext):**
```sh
pnpm cf-build       # Build for Cloudflare
pnpm preview        # Preview Cloudflare build
pnpm deploy         # Deploy to Cloudflare
```

**Database:**
```sh
supabase start      # Start local Supabase
supabase stop       # Stop local Supabase
```

## Coding Style & Conventions

**Language & Framework:**
- TypeScript, React 19, Next.js 15
- 2-space indent, LF line endings, single quotes, semicolons
- Biome handles formatting and import organization

**File Naming:**
- Use kebab-case for filenames (e.g., `add-logs-dialog.tsx`)
- Components: PascalCase exports
- Tests: `*.test.ts` or `*.test.tsx` (use `*.spec.*` if preferred)

**Module Organization:**
- Prefer path aliases (`@client`, `@server`, `@shared`) over relative imports
- Colocate simple hooks/utils with features or place in `lib/*`

## Testing Guidelines

- **Framework:** Vitest (jsdom) + Testing Library
- **Location:** Under `tests/` mirroring source paths
  - Example: `tests/server/api/v1/reactive-agents/agents.test.ts`
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
  - `feat(server): add feedback endpoint`
  - `fix(client): handle empty dataset state`
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
- Agent validation: `lib/shared/utils/agent-validation.ts` and `lib/client/hooks/use-agent-validation.ts`
- Skill validation: `lib/shared/utils/skill-validation.ts` and `lib/client/hooks/use-skill-validation.ts`

**Reusable Components:**
- `AgentStatusIndicator` (`lib/client/components/agents/agent-status-indicator.tsx`)
- `SkillStatusIndicator` (`lib/client/components/agents/skills/skill-status-indicator.tsx`)

**User Experience:**
- Guide users to add required components when viewing incomplete agents/skills

## Security & Configuration

- **Secrets:** Never commit secrets; use `.env` for local development
- **Supabase:** Migrations go in `supabase/migrations/`; seed data in `supabase/seed.sql`
- **Environment changes:** Regenerate Cloudflare types with `pnpm cf-typegen`
- **API/Middleware changes:** Include server/client tests and update docs in `docs/` when relevant

We appreciate your contributions! 💖
