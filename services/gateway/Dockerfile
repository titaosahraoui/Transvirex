# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests first (better layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/gateway/package.json ./services/gateway/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/gateway ./services/gateway

# Build shared package then gateway
RUN pnpm --filter @transvirex/shared build 2>/dev/null || true
RUN pnpm --filter @transvirex/gateway build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/gateway/package.json ./services/gateway/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/services/gateway/dist ./services/gateway/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist 2>/dev/null || true

WORKDIR /app/services/gateway
EXPOSE 4000
CMD ["node", "dist/index.js"]
