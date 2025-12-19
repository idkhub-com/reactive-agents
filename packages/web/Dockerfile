# Build from repo root: docker build -f packages/web/Dockerfile -t reactive-agents-web .
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY . .

ENV NODE_ENV=production

RUN pnpm --filter @reactive-agents/web build

FROM nginx:alpine AS runner

# Copy nginx configuration
COPY packages/web/nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
