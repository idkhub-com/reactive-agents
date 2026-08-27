# Build from repo root: docker build -f packages/web/Dockerfile -t super-agents-web .
FROM node:22-alpine AS base

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN wget -qO- https://get.pnpm.io/install.sh | PNPM_VERSION=10.10.0 ENV="$HOME/.shrc" SHELL="$(which sh)" sh -
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY . .

ENV NODE_ENV=production

RUN pnpm --filter @super-agents/web build

FROM nginx:alpine AS runner

# Copy nginx configuration
COPY packages/web/nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
