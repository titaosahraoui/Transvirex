FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/mission/package.json ./services/mission/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/mission ./services/mission
RUN pnpm --filter @transvirex/shared build 2>/dev/null || true
RUN pnpm --filter @transvirex/mission build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/mission/package.json ./services/mission/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/services/mission/dist ./services/mission/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist 2>/dev/null || true
WORKDIR /app/services/mission
EXPOSE 4002
CMD ["node", "dist/index.js"]
