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

FROM node:22-alpine AS runner
WORKDIR /app

# The API is bundled by esbuild, so no node_modules are needed at runtime.
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
