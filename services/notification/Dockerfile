FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/notification/package.json ./services/notification/
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/notification ./services/notification
RUN pnpm --filter @transvirex/shared build
RUN pnpm --filter @transvirex/notification build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/notification/package.json ./services/notification/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/services/notification/dist ./services/notification/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
WORKDIR /app/services/notification
EXPOSE 4005
CMD ["node", "dist/index.js"]
