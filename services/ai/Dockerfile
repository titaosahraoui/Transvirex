# AI service uses @tensorflow/tfjs-node in Docker (Linux = no native build issues)
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
# Install build tools needed for tfjs-node native addon
RUN apk add --no-cache python3 make g++
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/ai/package.json ./services/ai/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/ai ./services/ai
RUN pnpm --filter @transvirex/shared build 2>/dev/null || true
RUN pnpm --filter @transvirex/ai build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/ai/package.json ./services/ai/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/services/ai/dist ./services/ai/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist 2>/dev/null || true
WORKDIR /app/services/ai
EXPOSE 4004
CMD ["node", "dist/index.js"]
