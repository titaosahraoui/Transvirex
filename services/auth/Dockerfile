FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/auth/package.json ./services/auth/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/auth ./services/auth
RUN pnpm --filter @transvirex/shared build 2>/dev/null || true
RUN pnpm --filter @transvirex/auth build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/auth/package.json ./services/auth/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/services/auth/dist ./services/auth/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist 2>/dev/null || true
WORKDIR /app/services/auth
EXPOSE 4001
CMD ["node", "dist/index.js"]
