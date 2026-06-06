# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Transvirex** is a logistics/transport management platform built as a pnpm monorepo with Turborepo. It consists of four role-specific React frontends and six backend microservices, all written in TypeScript.

## Commands

All commands run from the repo root using pnpm + Turborepo unless targeting a specific workspace.

```bash
# Install dependencies
pnpm install

# Run all services/apps in dev mode concurrently
pnpm dev

# Build everything (respects topological order via Turborepo)
pnpm build

# Run all tests
pnpm test

# Target a single workspace
pnpm --filter @transvirex/auth dev
pnpm --filter @transvirex/auth test

# Run a single test file (in a service using Jest)
cd services/auth && pnpm exec jest src/__tests__/auth.test.ts

# Run a single test file (in an app using Vitest)
cd apps/billing && pnpm exec vitest run src/__tests__/SomeComponent.test.tsx

# Run all services via Docker (includes Postgres + MongoDB)
docker compose up --build
```

## Architecture

### Monorepo Layout

```
apps/          — React frontends (Vite + React 18 + Tailwind)
  billing/     → port 3003   (role: billing)
  dispatcher/  → port 3002   (role: dispatcher)
  driver/      → port 3001   (role: driver)
  management/  → port 3000   (role: management)

services/      — Node/Express microservices (TypeScript)
  gateway/     → port 4000   (API gateway + JWT guard)
  auth/        → port 4001   (users, drivers, JWT issuance)
  mission/     → port 4002   (mission CRUD + delivery events)
  billing-svc/ → port 4003   (invoices + payments)
  ai/          → port 4004   (TF.js driver-assignment scoring)
  notification/→ port 4005   (Socket.IO real-time hub)

packages/
  shared/      — shared TypeScript types + API response helpers. Built to `dist/` via `pnpm --filter @transvirex/shared build`. Service tsconfigs resolve it via `paths` pointing to `dist/`. Must be rebuilt when shared source changes.
```

### Auth Flow

The gateway (`services/gateway`) is the single ingress for all frontend traffic. It:
1. Verifies the Bearer JWT on every request except `POST /auth/login` and `POST /auth/register`.
2. Injects `x-user-id`, `x-user-role`, and `x-user-email` headers into the forwarded request.
3. Proxies to the appropriate upstream service (raw body pass-through — no `express.json()` at gateway level).

**Path rewriting is critical**: Express's `app.use('/prefix', middleware)` strips the prefix from `req.url` before the middleware sees it. The gateway uses `pathRewrite: { '^/': '/${prefix}/' }` in every `createProxyMiddleware` call to re-attach the prefix before forwarding. Without this, upstream services receive `/register` instead of `/auth/register` and return Express's default "Cannot POST /register" 404.

Downstream services (`mission`, `billing-svc`, `ai`) **do not re-verify the JWT**. They read the `x-user-*` headers via `requireUser` middleware and trust they came through the gateway. Calling a downstream service directly without those headers returns 401.

The `notification` service is **not** behind the gateway; frontend apps connect to it directly on port 4005 via Socket.IO and authenticate with the JWT in the handshake `auth.token`.

### Frontend Auth Pattern

Every app (`apps/*`) follows the same pattern:
- `AuthContext.tsx` — holds `user`, `token`, `login()`, `register()`, `logout()`. The axios instance (`api`) is created here with `VITE_GATEWAY_URL` as `baseURL` and attaches the JWT from `localStorage` via a request interceptor.
- `ProtectedRoute` component redirects unauthenticated users to `/login`.
- Each app registers with a hardcoded `role` string on `/auth/register` (e.g., `role: 'billing'` in the billing app).

### Databases

| Service | Store | Schema type |
|---|---|---|
| auth | PostgreSQL | users + drivers tables (auto-migrated on startup via `initSchema()`) |
| mission | PostgreSQL + MongoDB | missions table in PG; DeliveryEvent documents in Mongo |
| billing-svc | PostgreSQL | invoices + payments tables |
| notification | MongoDB | Message documents (chat history) |
| ai | none | stateless — model trained in-memory at startup |

### `@transvirex/shared` Package

Consumed by all services and apps as `workspace:*`. The package's `main`/`types` fields point to `./src/index.ts` (no compilation needed). It exports:

- **`ApiResponse<T>`** — standard envelope: `{ status, data?, error?, timestamp }`
- **`createSuccess(data)`**, **`createError(code, message)`**, **`createPending(data?)`** — constructors used by every service route handler
- Domain types: `User`, `Driver`, `Mission`, `Invoice`, `Message` (in `packages/shared/src/types/`)
- **Note:** `packages/shared/src/api/client.ts` (the axios client) is intentionally not re-exported from `index.ts` — it's frontend-only and imported directly.

### AI Service

`services/ai` runs a TensorFlow.js neural network trained from scratch on 2,000 synthetic samples each time the process starts (`services/ai/src/ml/model.ts`). It scores drivers for mission assignment using 7 features (distance, load, acceptance rate, experience, urgency, time-of-day, zone match). The model is a singleton — first call trains it, subsequent calls reuse it.

### Notification Service (Socket.IO)

`services/notification` maintains an in-memory `userSocketMap: Map<userId, socketId>`. Other services push events via `POST /emit { event, userId, data }`. There is no durable delivery — if the user is offline, the event is dropped. For multi-instance deployment, this map would need Redis.

Socket events:
- Client→Server: `message:send`, `driver:location`
- Server→Client: `message:received`, `message:delivered`, `mission:assigned`, `mission:status`, `alert:delay`

## Environment Variables

Each service reads from a `.env` file. The required variables per service (mirroring `docker-compose.yml`):

| Variable | Services |
|---|---|
| `JWT_SECRET` | gateway, auth, notification |
| `JWT_EXPIRES_IN` | auth |
| `DATABASE_URL` | auth, mission, billing-svc |
| `MONGODB_URI` | mission, notification |
| `PORT` | all services |
| `AUTH_SERVICE_URL` | gateway, ai |
| `MISSION_SERVICE_URL` | gateway, ai |
| `BILLING_SERVICE_URL` | gateway |
| `AI_SERVICE_URL` | gateway |
| `NOTIFICATION_SERVICE_URL` | mission |

Frontend apps use `VITE_GATEWAY_URL` (defaults to `http://localhost:4000`).

## Testing

- **Services** use Jest + `ts-jest`. Test files live in `src/__tests__/*.test.ts`.
- **Apps** use Vitest + `@testing-library/react`.
- Jest `moduleNameMapper` in each service maps `@transvirex/shared` directly to the shared package's `src/index.ts`.
- The notification service uses `--passWithNoTests` because it has no tests yet.
