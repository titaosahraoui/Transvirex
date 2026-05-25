FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/billing-svc/package.json ./services/billing-svc/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/billing-svc ./services/billing-svc
RUN pnpm --filter @transvirex/shared build 2>/dev/null || true
RUN pnpm --filter @transvirex/billing-svc build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/billing-svc/package.json ./services/billing-svc/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/services/billing-svc/dist ./services/billing-svc/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist 2>/dev/null || true
WORKDIR /app/services/billing-svc
EXPOSE 4003
CMD ["node", "dist/index.js"]
