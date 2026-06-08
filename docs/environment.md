# Environment Variables

Each service reads from a `.env` file in its own directory. When running via Docker (`docker compose up`), values come from `docker-compose.yml`.

---

## Per-service reference

### Gateway — `services/gateway/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Port the gateway listens on |
| `JWT_SECRET` | `changeme_replace_in_production` | Secret used to verify incoming JWTs |
| `AUTH_SERVICE_URL` | `http://localhost:4001` | URL of the auth service |
| `MISSION_SERVICE_URL` | `http://localhost:4002` | URL of the mission service |
| `BILLING_SERVICE_URL` | `http://localhost:4003` | URL of the billing service |
| `AI_SERVICE_URL` | `http://localhost:4004` | URL of the AI service |

---

### Auth service — `services/auth/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `4001` | Port the service listens on |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/transvirex` | PostgreSQL connection string |
| `JWT_SECRET` | `changeme_replace_in_production` | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | `7d` | JWT expiry duration |

---

### Mission service — `services/mission/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `4002` | Port the service listens on |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/transvirex` | PostgreSQL connection string |
| `MONGODB_URI` | `mongodb://localhost:27017/transvirex` | MongoDB connection string |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:4005` | URL of the notification service (used to push Socket.IO events) |

---

### Billing service — `services/billing-svc/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `4003` | Port the service listens on |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/transvirex` | PostgreSQL connection string |

---

### AI service — `services/ai/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `4004` | Port the service listens on |
| `AUTH_SERVICE_URL` | `http://localhost:4001` | Used to fetch driver profiles for scoring |
| `MISSION_SERVICE_URL` | `http://localhost:4002` | Used to fetch mission data for scoring |

---

### Notification service — `services/notification/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `4005` | Port the service listens on (HTTP + Socket.IO) |
| `JWT_SECRET` | `changeme_replace_in_production` | Secret used to verify Socket.IO handshake JWTs |
| `MONGODB_URI` | `mongodb://localhost:27017/transvirex` | MongoDB connection string (message storage) |

---

### Frontend apps — `apps/*/.env`

All four apps use the same variable:

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_GATEWAY_URL` | `http://localhost:4000` | Base URL for all API calls (axios `baseURL`) |

If `VITE_GATEWAY_URL` is not set, the axios instance defaults to `http://localhost:4000`.

---

## Docker compose defaults

When running with `docker compose up`, shared secrets are defined at the top of `docker-compose.yml` and injected into all relevant services:

```yaml
x-jwt: &jwt
  JWT_SECRET: changeme_replace_in_production
  JWT_EXPIRES_IN: 7d

x-pg: &pg
  DATABASE_URL: postgresql://postgres:postgres@postgres:5432/transvirex

x-mongo: &mongo
  MONGODB_URI: mongodb://mongodb:27017/transvirex
```

**Change `JWT_SECRET` before any production deployment.**
