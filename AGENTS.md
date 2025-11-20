# Repository Guidelines

This file provides guidance to AI assistants when working with code in this repository.

## Project Structure & Module Organization

This is a **Next.js/TypeScript application** with a clean three-layer architecture:

- **`app/`**: Next.js routes (RSC), layouts, page entries
- **`lib/`**: Shared code organized by layer:
  - `lib/client/` - React components, API clients, hooks, UI utilities
  - `lib/server/` - Hono-based API, AI provider integrations, middleware, database connectors
  - `lib/shared/` - Shared types, Zod schemas, utilities
- **`tests/`**: Vitest suites mirroring app/lib (client, server, shared)
- **`public/`**: Static assets
- **`docs/`**, **`examples/`**, **`scripts/`**: Documentation and utilities
- **`supabase/`**: Local dev DB config, migrations, `seed.sql`
- **Key aliases**: `@client`, `@server`, `@shared`

## Essential Commands

**You must run these commands after modifying any file to ensure code quality:**
```bash
pnpm typecheck  # TypeScript type checking - REQUIRED
pnpm check      # Biome linting and formatting - REQUIRED
pnpm check:fix  # Auto-fix linting and formatting issues
```

### Development Commands
```bash
# Installation and setup
pnpm install

# Database
supabase start  # Start local Supabase database
supabase stop   # Stop local database

# Development server
pnpm dev        # Start development server (Next.js + Turbopack, auto-restarts on changes)

# Testing
pnpm test                      # Run all tests (excludes in-depth integration tests)
pnpm test path/to/test.ts      # Run specific test file
pnpm test:watch                # Run tests in watch mode

# In-depth integration tests (slower, more comprehensive)
INCLUDE_IN_DEPTH=true pnpm test
INCLUDE_IN_DEPTH=true pnpm test tests/server/connectors/in-depth/tool-correctness/integration-test.test.ts

# Build and production
pnpm build      # Build for production
pnpm start      # Serve production build

# Code quality
pnpm lint       # Run linter
pnpm format     # Check formatting
pnpm format:fix # Auto-fix formatting

# Cloudflare deployment (OpenNext)
pnpm cf-build   # Build for Cloudflare
pnpm preview    # Preview Cloudflare build
pnpm deploy     # Deploy to Cloudflare
pnpm cf-typegen # Regenerate Cloudflare types when env changes

# API testing
curl "http://localhost:3000/v1/endpoint" -H "Authorization: Bearer reactive-agents"
```

## API Structure (Hono-based)

The application uses **Hono** web framework with TypeScript path aliases:
- Main API entry: `/app/v1/[[...route]]/route.ts`
- Server routes: `/lib/server/api/v1/`
- Client API calls: `/lib/client/api/v1/`

Key API endpoints:
- `/v1/chat/completions` - OpenAI-compatible chat API
- `/v1/reactive-agents/agents` - Agent management
- `/v1/reactive-agents/evaluations` - Dataset and evaluation management
- `/v1/reactive-agents/observability/logs` - Request logging

## Database Integration (Supabase)

Uses **connector pattern** for data access:
- Abstract interfaces: `UserDataStorageConnector`, `LogsStorageConnector`
- Concrete implementation: Supabase connector
- All CRUD operations use Zod schema validation

Core data models:
- `Agent` - AI agent configurations
- `Dataset`/`Log` - Training/evaluation data with many-to-many relationships
- `EvaluationRun`/`LogOutput` - Model evaluation system
- `Feedback`/`ImprovedResponse` - User feedback loop

Database management:
- Migrations: `supabase/migrations/`
- Seed data: `supabase/seed.sql`
- Start/stop: `supabase start|stop`

## Coding Style & Naming Conventions

- **Language**: TypeScript, React 19, Next.js 15
- **Formatting via Biome**: 2-space indent, LF, single quotes, semicolons, import organize
  - Auto-fix: `pnpm check:fix` or `pnpm format:fix`
- **Files**: kebab-case for filenames (e.g., `add-logs-dialog.tsx`)
- **Components**: PascalCase exports; colocate simple hooks/utils with feature or place in `lib/*`
- **Paths**: prefer `@client`, `@server`, `@shared` over long relative paths

**Hono Syntax**: Always use chained method syntax for proper type inference:
```typescript
// Use this pattern:
const app = new Hono<AppEnv>().get().post().fetch();

// Instead of:
const app = new Hono<AppEnv>();
app.get();
app.post();
app.fetch();
```

## Testing Guidelines

**Framework**: Vitest (jsdom) + Testing Library
- **Location**: under `tests/` mirroring source paths (e.g., `tests/server/api/v1/reactive-agents/agents.test.ts`)
- **Naming**: `*.test.ts` or `*.test.tsx`; use `*.spec.*` if useful
- **Run**: `pnpm test` (CI mode) or `pnpm test:watch` (dev)
- **Coverage**: Reports generated in text/json/html; keep meaningful coverage for changed code
- **Integration tests**: Use `INCLUDE_IN_DEPTH=true pnpm test` for comprehensive testing

### Testing Patterns

**Mock Strategy**: Always mock the full connector in tests:
```typescript
const mockUserDataStorageConnector: unknown = {
  getAgents: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  // ... all other connector methods
};
```

**Client API Tests**: Mock the entire API module to control HTTP responses:
```typescript
vi.mock('@client/api/v1/reactive-agents/agents', () => ({
  getAgents: vi.fn().mockImplementation(async (params) => {
    const response = await mockGet({ query: params });
    if (!response.ok) throw new Error('Failed to fetch agents');
    return response.json();
  }),
}));
```

**Server API Tests**: Use Hono testClient with middleware injection:
```typescript
const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.set('user_data_storage_connector', mockConnector);
    await next();
  })
  .route('/', routerUnderTest);

const client = testClient(app);
```

## AI Provider System

The application supports 40+ AI providers through a unified interface. Each provider implements:
- `chat-complete` - Chat completions
- `complete` - Text completions
- `embed` - Embeddings
- `image-generate` - Image generation

Provider implementations are in `/lib/server/ai-providers/[provider]/`.

## Authentication

Dual authentication system:
- **Client**: Next.js middleware with JWT cookies for dashboard access
- **API**: Hono middleware with Bearer token validation (`Authorization: Bearer reactive-agents`)

## Agent Validation & Readiness

- **Agent Requirements**: All agents must have at least one skill configured to be considered "ready"
- **Skill Requirements**: All skills must meet the following to be considered "ready":
  - At least one model must be configured
  - If optimization is enabled, at least one evaluation must be configured
- **UI Indicators**:
  - Agents/skills without requirements display an orange indicator icon or badge
  - Detail views show warning banners for incomplete agents/skills
  - Popover tooltips explain what requirements are missing
- **Validation Logic**:
  - Agent validation: `lib/shared/utils/agent-validation.ts` and `lib/client/hooks/use-agent-validation.ts`
  - Skill validation: `lib/shared/utils/skill-validation.ts` and `lib/client/hooks/use-skill-validation.ts`
- **Reusable Components**:
  - `AgentStatusIndicator` (`lib/client/components/agents/agent-status-indicator.tsx`)
  - `SkillStatusIndicator` (`lib/client/components/agents/skills/skill-status-indicator.tsx`)
- **User Experience**: Guide users to add required components when viewing incomplete agents/skills

## Skill Optimization System

### System Prompt Evolution

System prompts evolve through two distinct phases:

1. **Early Regeneration (after 5 skill requests)**:
   - Triggered once per skill when `evaluations_regenerated_at` is undefined
   - Regenerates evaluations with real examples from the first 5 requests
   - Generates new system prompts for ALL arms using `generateSeedSystemPromptWithContext()`
   - Includes actual JSON schemas from `response_format` and real example conversations
   - Deletes all existing arms and recreates with new prompts and reset stats
   - Resets all cluster `total_steps` to 0 (complete reset - all arms are brand new)
   - Sets `skill.metadata.evaluations_regenerated_at` to mark completion

2. **Reflection-based Regeneration (ongoing per cluster)**:
   - Triggered when all arms in a cluster meet the minimum request threshold
   - Uses `generateReflectiveSystemPromptForSkill()` to improve the best-performing prompt
   - Provides contrastive examples for targeted improvement:
     - High-scoring logs from the cluster (what's working well)
     - Low-scoring logs from the cluster (what needs improvement)
     - AI instructed to maintain strengths while fixing weaknesses
   - Updates arms according to conservative algorithm:
     - **Best arm**: Kept completely intact (config + stats unchanged)
     - **Worst arm**: Gets best arm's config + new prompt (stats reset)
     - **Middle arms**: Get new prompt only (stats reset)
   - Resets cluster `total_steps` to best arm's `n` (only valid historical data)
   - Per-cluster process: each cluster evolves independently

### Key Design Decisions

- **Skill-level early regeneration**: All clusters regenerate together after 5 skill requests (not per-cluster)
- **Conservative reflection**: Best arm is never modified, guaranteeing performance never degrades
- **In-place updates**: Arms are updated rather than deleted/recreated during reflection
- **Stats comparability**: When system prompts change, affected arm stats reset to 0 to ensure fair comparison
- **Cluster state handling**:
  - **Early regeneration**: `total_steps` reset to 0 (all arms deleted/recreated, no historical data)
  - **Ongoing reflection**: `total_steps` set to best arm's `n` (only valid historical data after other arms reset)
- **Description changes**: Updating a skill's description resets `evaluations_regenerated_at` to trigger early regeneration again

### Internal Skills

The system uses special auto-generated skills in the `reactive-agents` agent (defined in `RA_SKILLS` constant):
- `system-prompt-seeding`: Initial prompt generation without context
- `system-prompt-seeding-with-context`: Context-aware generation with examples and schemas
- `system-prompt-reflection`: Reflection-based improvements
- `create-evaluations`: Evaluation method generation
- `judge`: Evaluation scoring
- `extract-task-and-outcome`: Task/outcome extraction
- `embedding`: Text embedding generation

## Development Workflow

1. Files auto-save and restart the development server
2. **Always run `pnpm typecheck` and `pnpm check` after changes**
3. Write comprehensive tests covering success/error status codes
4. Use TypeScript path aliases: `@client/*`, `@server/*`, `@shared/*`
5. Follow the connector pattern for external service integration

## Commit & Pull Request Guidelines

- **Conventional Commits required**. Examples:
  - `feat(server): add feedback endpoint`
  - `fix(client): handle empty dataset state`
- **Before pushing**: `pnpm typecheck && pnpm check && pnpm test`
- **PRs include**: problem/solution summary, linked issues, screenshots for UI, test notes, and any schema/migration callouts

## Security & Configuration

- **Secrets**: Never commit secrets; use `.env` for local development
- **Environment changes**: Regenerate Cloudflare types with `pnpm cf-typegen` when env changes
- **Middleware and API changes**: Include server/client tests and docs updates in `docs/` when relevant
