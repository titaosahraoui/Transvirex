# Architecture

## Overview

All four frontend apps talk exclusively to the **API Gateway** on port 4000. The gateway verifies the JWT and proxies requests to the appropriate upstream microservice. The only exception is the **Notification service** (Socket.IO), which frontends connect to directly on port 4005.

```
Browser ──→ Gateway :4000 ──→ Auth       :4001  (PostgreSQL)
                          ├──→ Mission    :4002  (PostgreSQL + MongoDB)
                          ├──→ Billing    :4003  (PostgreSQL)
                          └──→ AI         :4004  (stateless)

Browser ──→ Notification :4005            (MongoDB, Socket.IO)
```

## Auth flow

1. Frontend calls `POST /auth/register` or `POST /auth/login` — these are the only public (no-JWT) gateway routes.
2. Auth service issues a signed JWT containing `{ userId, role, email }`.
3. Frontend stores the token in `localStorage` and attaches it to every subsequent request as `Authorization: Bearer <token>`.
4. Gateway's `jwtGuard` middleware verifies the token on every request (except the two public routes above).
5. On success, the gateway injects three headers before proxying the request downstream:
   - `x-user-id` — decoded `userId`
   - `x-user-role` — decoded `role`
   - `x-user-email` — decoded `email`
6. Downstream services (`mission`, `billing-svc`, `ai`) read these headers via `requireUser` middleware and trust they came from the gateway. They do **not** re-verify the JWT.

## Gateway path rewriting

Express's `app.use('/prefix', middleware)` strips the prefix from `req.url` before the middleware sees it. Without correction, the upstream would receive `/register` instead of `/auth/register` and return a 404.

The gateway uses `pathRewrite: { '^/': '/${prefix}/' }` in every `createProxyMiddleware` call to re-attach the prefix so upstream services receive the full path.

## Notification service (Socket.IO)

The notification service is **not** behind the gateway. Frontends connect directly on port 4005 and authenticate by passing the JWT in the Socket.IO handshake:

```ts
io({ auth: { token: localStorage.getItem('token') } })
```

The service maintains an in-memory `userSocketMap: Map<userId, socketId>`. Other microservices push events via `POST /emit { event, userId, data }`. If the user is offline the event is silently dropped — there is no durable delivery queue. A Redis adapter would be needed for multi-instance deployments.

## Database assignments

| Service | Store | Usage |
|---------|-------|-------|
| auth | PostgreSQL | `users` and `drivers` tables |
| mission | PostgreSQL | `missions` table |
| mission | MongoDB | `delivery_events` collection (GPS pings, status events) |
| billing-svc | PostgreSQL | `invoices` and `payments` tables |
| notification | MongoDB | `messages` collection (chat history) |
| ai | none | Stateless — model is trained in-memory at startup |

## AI service

`services/ai` runs a TensorFlow.js neural network. The model is trained from scratch on 2,000 synthetic samples every time the process starts (`services/ai/src/ml/model.ts`). It is a singleton — the first request triggers training, subsequent calls reuse the trained model.

Scoring features (7 inputs per driver candidate):
1. Distance from driver to pickup
2. Current load (active missions)
3. Historical acceptance rate
4. Years of experience
5. Mission urgency level
6. Time of day
7. Zone match (driver zone vs mission zone)

## Shared package

`packages/shared` is consumed by all services and apps as `workspace:*`. It exports:
- `ApiResponse<T>` — standard response envelope `{ status, data?, error?, timestamp }`
- `createSuccess(data)`, `createError(code, message)`, `createPending(data?)` — response constructors
- Domain types: `User`, `Driver`, `Mission`, `Invoice`, `Message`

The axios client (`packages/shared/src/api/client.ts`) is frontend-only and not re-exported from `index.ts` — it is imported directly by each app's `AuthContext.tsx`.
