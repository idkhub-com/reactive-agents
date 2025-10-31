# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Individual Preferences
- @~/.claude/personal-instructions.md

## Essential Commands

You must run these commands after modifying any file to ensure code quality:
```bash
pnpm typecheck  # TypeScript type checking
pnpm check      # Biome linting and formatting
pnpm check:fix  # Run biome linting and formatting and automatically fix issues
```

Development server commands:
```bash
pnpm dev        # Start development server (auto-restarts on changes)
pnpm test       # Run all tests (excludes in-depth integration tests)
pnpm test path/to/test.ts  # Run specific test file
```

Integration test commands:
```bash
# Run all tests including in-depth integration tests (slower, more comprehensive)
INCLUDE_IN_DEPTH=true pnpm test

# Run specific in-depth test file
INCLUDE_IN_DEPTH=true pnpm test tests/server/connectors/in-depth/tool-correctness/integration-test.test.ts
```

API testing:
```bash
curl "http://localhost:3000/v1/endpoint" -H "Authorization: Bearer reactive-agents"
```

## Architecture Overview

This is a **Next.js/TypeScript application** with a clean three-layer architecture:

- **`lib/client/`** - React components, API clients, hooks, UI utilities
- **`lib/server/`** - Hono-based API, AI provider integrations, middleware, database connectors  
- **`lib/shared/`** - Shared types, Zod schemas, utilities

### API Structure (Hono-based)

The application uses **Hono** web framework with TypeScript path aliases:
- Main API entry: `/app/v1/[[...route]]/route.ts`
- Server routes: `/lib/server/api/v1/`
- Client API calls: `/lib/client/api/v1/`

Key API endpoints:
- `/v1/chat/completions` - OpenAI-compatible chat API
- `/v1/reactive-agents/agents` - Agent management
- `/v1/reactive-agents/evaluations` - Dataset and evaluation management
- `/v1/reactive-agents/observability/logs` - Request logging

### Database Integration (Supabase)

Uses **connector pattern** for data access:
- Abstract interfaces: `UserDataStorageConnector`, `LogsStorageConnector`
- Concrete implementation: Supabase connector
- All CRUD operations use Zod schema validation

Core data models:
- `Agent` - AI agent configurations
- `Dataset`/`Log` - Training/evaluation data with many-to-many relationships
- `EvaluationRun`/`LogOutput` - Model evaluation system
- `Feedback`/`ImprovedResponse` - User feedback loop

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

## Development Workflow

1. Files auto-save and restart the development server
2. Always run `pnpm typecheck` and `pnpm check` after changes
3. Write comprehensive tests covering success/error status codes
4. Use TypeScript path aliases: `@client/*`, `@server/*`, `@shared/*`
5. Follow the connector pattern for external service integration
