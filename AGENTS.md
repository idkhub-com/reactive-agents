# Repository Guidelines

This file provides guidance to AI assistants when working with code in this repository.

## Project Structure & Module Organization

This is a **TypeScript monorepo** using pnpm workspaces with three packages:

```
packages/
├── web/           # Vite + TanStack Router SPA (React 19)
│   └── src/
│       ├── routes/        # TanStack Router file-based routes
│       ├── components/    # React components
│       ├── providers/     # React context providers
│       ├── hooks/         # Custom React hooks
│       └── api/           # API client functions
├── api/           # Hono API server (Node.js)
│   └── src/
│       ├── api/           # API routes
│       ├── ai-providers/  # AI provider integrations (40+)
│       ├── connectors/    # Database connectors
│       └── middlewares/   # Hono middlewares
└── shared/        # Shared types, Zod schemas, utilities
    └── src/
        ├── types/         # TypeScript types
        └── utils/         # Shared utilities
```

Other directories:
- **`tests/`**: Vitest suites mirroring packages (client, server, shared)
- **`examples/`**: Example implementations
- **`supabase/`**: Local dev DB config, migrations, `seed.sql`
- **`docker/`**: Docker configuration files

**Key path aliases**:
- `@web/*` - Web package (`packages/web/src/*`)
- `@api/*` or `@server/*` - API package (`packages/api/src/*`)
- `@shared/*` - Shared package (`packages/shared/src/*`)

## Essential Commands

**You must run these commands after modifying any file to ensure code quality:**
```bash
pnpm typecheck  # TypeScript type checking (uses Turborepo) - REQUIRED
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

# Development server (runs both web and API via Turborepo)
pnpm dev        # Start all dev servers in parallel
pnpm dev:web    # Start only web dev server (Vite on port 3000)
pnpm dev:api    # Start only API dev server (Hono on port 8787)

# Testing
pnpm test                      # Run all tests (excludes in-depth integration tests)
pnpm test path/to/test.ts      # Run specific test file
pnpm test:watch                # Run tests in watch mode

# In-depth integration tests (slower, more comprehensive)
INCLUDE_IN_DEPTH=true pnpm test

# Build (uses Turborepo with caching)
pnpm build      # Build all packages
pnpm build:web  # Build only web package
pnpm build:api  # Build only API package

# Code quality
pnpm lint       # Run linter
pnpm format     # Check formatting
pnpm format:fix # Auto-fix formatting

# API testing (all requests go through port 3000, proxied to API)
curl "http://localhost:3000/v1/endpoint" -H "Authorization: Bearer reactive-agents"
```

## Architecture

### Web Application (packages/web)
- **Framework**: Vite + TanStack Router (SPA mode)
- **Routing**: File-based routing in `src/routes/`
  - `_main.tsx` - Layout wrapper with sidebar
  - `$paramName` - Dynamic route parameters
  - `.index.tsx` - Index routes for parent paths
- **Auto-generated**: `routeTree.gen.ts` (do not edit, in .gitignore)

### API Server (packages/api)
- **Framework**: Hono web framework
- **Entry**: `src/server.ts` (Node.js) or `src/index.ts` (Cloudflare Workers)
- **Routes**: `src/api/v1/`

### Request Flow
```
Browser (port 3000) → Vite/nginx proxy → API (port 8787)
                           ↓
                    /v1/* requests proxied
```

In development, Vite proxies `/v1/*` requests to the API server.
In Docker, nginx handles the proxying.

## API Structure (Hono-based)

Key API endpoints:
- `/v1/chat/completions` - OpenAI-compatible chat API
- `/v1/reactive-agents/agents` - Agent management
- `/v1/reactive-agents/evaluations` - Dataset and evaluation management
- `/v1/reactive-agents/observability/logs` - Request logging

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

- **Language**: TypeScript, React 19, Vite, TanStack Router
- **Formatting via Biome**: 2-space indent, LF, single quotes, semicolons, import organize
  - Auto-fix: `pnpm check:fix` or `pnpm format:fix`
- **Files**: kebab-case for filenames (e.g., `add-logs-dialog.tsx`)
- **Components**: PascalCase exports
- **Paths**: prefer `@web`, `@api`, `@shared` over long relative paths

## Testing Guidelines

**Framework**: Vitest (jsdom) + Testing Library
- **Location**: under `tests/` mirroring source paths
- **Naming**: `*.test.ts` or `*.test.tsx`
- **Run**: `pnpm test` (CI mode) or `pnpm test:watch` (dev)
- **Coverage**: Reports generated in text/json/html

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

**Client API Tests**: Mock the entire API module:
```typescript
vi.mock('@web/api/v1/reactive-agents/agents', () => ({
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

Provider implementations are in `packages/api/src/ai-providers/[provider]/`.

## Authentication

- **API**: Hono middleware with Bearer token validation (`Authorization: Bearer reactive-agents`)
- **Dashboard**: Client-side authentication (when ACCESS_PASSWORD is set)

## Docker Deployment

```bash
docker compose up  # Start all services
```

Services:
- **postgres**: PostgreSQL database
- **postgrest**: PostgREST API for database access
- **api**: Hono API server (port 8787 internal)
- **web**: nginx serving Vite SPA (port 3000, proxies /v1/* to api)

The web container uses nginx to:
1. Serve static files from the Vite build
2. Proxy `/v1/*` requests to the API container
3. Handle SPA routing (fallback to index.html)

## Agent Validation & Readiness

- **Agent Requirements**: All agents must have at least one skill configured to be considered "ready"
- **Skill Requirements**: All skills must meet the following to be considered "ready":
  - At least one model must be configured
  - If optimization is enabled, at least one evaluation must be configured
- **Validation Logic**:
  - Agent validation: `packages/shared/src/utils/agent-validation.ts`
  - Skill validation: `packages/shared/src/utils/skill-validation.ts`

## Skill Optimization System

### System Prompt Evolution

System prompts evolve through two distinct phases:

1. **Early Regeneration (after 5 skill requests)**:
   - Triggered once per skill when `evaluations_regenerated_at` is undefined
   - Regenerates evaluations with real examples from the first 5 requests
   - Generates new system prompts for ALL arms
   - Resets all cluster `total_steps` to 0

2. **Reflection-based Regeneration (ongoing per cluster)**:
   - Triggered when all arms in a cluster meet the minimum request threshold
   - Uses contrastive examples (high-scoring vs low-scoring logs)
   - Conservative algorithm: best arm never modified

### Internal Skills

The system uses special auto-generated skills in the `reactive-agents` agent (defined in `RA_SKILLS` constant):
- `system-prompt-seeding`: Initial prompt generation
- `system-prompt-seeding-with-context`: Context-aware generation
- `system-prompt-reflection`: Reflection-based improvements
- `create-evaluations`: Evaluation method generation
- `judge`: Evaluation scoring
- `extract-task-and-outcome`: Task/outcome extraction
- `embedding`: Text embedding generation

## Development Workflow

1. Run `pnpm dev` to start both web and API servers
2. Web app available at `http://localhost:3000`
3. API requests are proxied through port 3000
4. **Always run `pnpm typecheck` and `pnpm check` after changes**
5. Use TypeScript path aliases: `@web/*`, `@api/*`, `@shared/*`

## Commit & Pull Request Guidelines

- **Conventional Commits required**. Examples:
  - `feat(server): add feedback endpoint`
  - `fix(web): handle empty dataset state`
- **Before pushing**: `pnpm typecheck && pnpm check && pnpm test`
- **PRs include**: problem/solution summary, linked issues, screenshots for UI, test notes

## Security & Configuration

- **Secrets**: Never commit secrets; use `.env` for local development
- **Environment variables**:
  - `API_URL` - API server URL (server-side)
  - `BEARER_TOKEN` - API authentication token
  - `ACCESS_PASSWORD` - Dashboard password (optional)
  - `AUTH_JWT_SECRET` - JWT signing secret for the dashboard session cookie (required in production)
  - `AI_PROVIDER_API_KEY_ENCRYPTION_KEY` - Encryption key for stored AI provider API keys (required in production)
  - `WEB_APP_URL` - Comma-separated origins allowed to make credentialed cross-origin
    requests. Only needed when the dashboard is hosted separately from the API; the
    Docker and Vite setups both proxy `/v1/*` from the same origin.
- **Reading env vars**: Never read `process.env` from request-handling code. Every
  environment value is exposed as a getter in `packages/api/src/constants.ts` that
  takes the Hono context (e.g. `getAccessPassword(c)`), so the same code works on
  Node and Cloudflare Workers. `packages/api/src/server.ts` merges `process.env`
  into `c.env` for the Node entrypoint.
