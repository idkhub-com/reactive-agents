# All-in-one image: the Hono API serves the built dashboard from the same
# process and the same port, so no reverse proxy container is needed.
#
# Build from repo root: docker build -t super-agents .
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY tsconfig.base.json tsconfig.json ./
COPY packages/api ./packages/api
COPY packages/web ./packages/web
COPY packages/shared ./packages/shared

ENV NODE_ENV=production

RUN pnpm --filter @super-agents/api build
RUN pnpm --filter @super-agents/web build

# Pin the runtime's `libsql` to whatever version pnpm resolved for the
# workspace, so the image and the lockfile cannot drift.
RUN node -e "const p=require('./packages/api/package.json'); require('fs').writeFileSync('runtime-package.json', JSON.stringify({ name: 'super-agents-runtime', private: true, dependencies: { libsql: p.dependencies.libsql } }, null, 2))"

FROM node:22-alpine AS runner
WORKDIR /app

# `libsql` loads a platform-specific native addon through a runtime require, so
# esbuild leaves it external (see packages/api/build.js) and it is installed
# here instead. Only the local-file libSQL backend loads it -- Supabase and
# remote libSQL deployments never touch it.
COPY --from=builder /app/runtime-package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Everything else is bundled by esbuild.
COPY --from=builder /app/packages/api/dist ./dist
# `DASHBOARD_ROOT` defaults to ./public, relative to WORKDIR.
COPY --from=builder /app/packages/web/dist ./public

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 hono && \
  chown -R hono:nodejs /app

USER hono

EXPOSE 3000
ENV PORT=3000

CMD ["node", "dist/server.js"]
