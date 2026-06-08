# Transvirex — Documentation

Transvirex is a logistics and transport management platform. Dispatchers create delivery missions, assign drivers, track them in real time, and billing staff invoice clients — all through role-specific web apps backed by microservices.

## Monorepo layout

| Component | Directory | Port | Role |
|-----------|-----------|------|------|
| Management app | `apps/management` | 3000 | Admin: users, drivers, dashboard |
| Driver app | `apps/driver` | 3001 | Driver: view/accept/complete missions |
| Dispatcher app | `apps/dispatcher` | 3002 | Dispatcher: create/assign/track missions |
| Billing app | `apps/billing` | 3003 | Billing: invoices and payments |
| API Gateway | `services/gateway` | 4000 | Single ingress, JWT guard, proxy |
| Auth service | `services/auth` | 4001 | Users, drivers, JWT issuance |
| Mission service | `services/mission` | 4002 | Mission CRUD + delivery events |
| Billing service | `services/billing-svc` | 4003 | Invoices + payments |
| AI service | `services/ai` | 4004 | Driver assignment scoring |
| Notification service | `services/notification` | 4005 | Socket.IO real-time hub |

## Quick start

```bash
# Install all dependencies
pnpm install

# Run everything in dev mode (all apps + all services)
pnpm dev

# Or run with Docker (includes PostgreSQL + MongoDB)
docker compose up --build
```

## Documentation index

- [Architecture](./architecture.md) — auth flow, gateway, databases, real-time design
- [Database schemas](./database.md) — PostgreSQL tables + MongoDB collections
- [Frontend routes](./frontend.md) — pages and routing for each app
- [Environment variables](./environment.md) — all env vars per service
- **API reference**
  - [Gateway](./api/gateway.md) — proxy routes exposed to frontends
  - [Auth](./api/auth.md) — register, login, users, drivers
  - [Missions](./api/missions.md) — mission lifecycle, filters, GPS tracking
  - [Billing](./api/billing.md) — invoices, payments, stats
  - [Notification](./api/notification.md) — Socket.IO events + HTTP push
  - [AI](./api/ai.md) — driver assignment scoring
