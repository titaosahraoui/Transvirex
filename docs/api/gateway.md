# API — Gateway

Base URL: `http://localhost:4000` (dev) — set via `VITE_GATEWAY_URL` in each frontend app.

The gateway is the single entry point for all frontend traffic. It verifies the JWT and proxies to the appropriate upstream service.

## Authentication

All routes except `POST /auth/login` and `POST /auth/register` require:

```
Authorization: Bearer <token>
```

Missing or invalid tokens return:
```json
{ "status": "error", "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }
```

## Health check

```
GET /health
```

Returns gateway status and upstream service URLs. No authentication required.

## Proxy routes

| Prefix | Upstream service | Port |
|--------|-----------------|------|
| `/auth` | auth-svc | 4001 |
| `/drivers` | auth-svc | 4001 |
| `/users` | auth-svc | 4001 |
| `/missions` | mission-svc | 4002 |
| `/billing` | billing-svc | 4003 |
| `/ai` | ai-svc | 4004 |

The gateway performs path rewriting to preserve the prefix when forwarding (e.g. `GET /missions/stats` → `GET /missions/stats` on mission-svc:4002, not `GET /stats`).

If an upstream service is unavailable the gateway returns HTTP 502:
```json
{ "status": "error", "error": { "code": "BAD_GATEWAY", "message": "Upstream service at ... is unavailable" } }
```

## Response envelope

All API responses use the shared `ApiResponse<T>` envelope:

```ts
// Success
{ "status": "success", "data": { ... }, "timestamp": "2026-06-07T..." }

// Error
{ "status": "error", "error": { "code": "SOME_CODE", "message": "..." }, "timestamp": "2026-06-07T..." }
```
