FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/billing/package.json ./apps/billing/
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY apps/billing ./apps/billing
ENV VITE_GATEWAY_URL=http://localhost:4000
ENV VITE_NOTIFICATION_URL=http://localhost:4005
RUN pnpm --filter @transvirex/billing build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/billing/dist /usr/share/nginx/html
EXPOSE 80
