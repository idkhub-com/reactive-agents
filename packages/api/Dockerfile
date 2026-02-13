# Build from repo root: docker build -f packages/api/Dockerfile -t reactive-agents-api .
# Uses Node.js with @hono/node-server instead of wrangler for Docker deployment
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY tsconfig.base.json ./
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

RUN pnpm --filter @reactive-agents/api build

FROM node:22-alpine AS runner
WORKDIR /app

# Copy bundled output (everything is bundled, no node_modules needed)
COPY --from=builder /app/packages/api/dist ./dist

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 hono && \
  chown -R hono:nodejs /app

USER hono

EXPOSE 8787
ENV PORT=8787

CMD ["node", "dist/server.js"]
