# Transvirex Logistics ERP — Design Spec

**Date:** 2026-05-24  
**Project:** Transvirex Logistics ERP ("Moving Intelligence")  
**Team:** 2–3 people | **Deadline:** ~2 weeks

---

## Context

Transvirex Logistics is a regional transport company (160+ independent drivers, 15 000 deliveries/month) suffering from:
- Dispatchers working across WhatsApp/phone/email with no global view
- Drivers receiving incomplete or late route updates
- Billing delays averaging 6 days
- Rising customer complaints from poor delivery tracking

The goal is a **logistics ERP** that centralises operations, enables real-time delivery tracking, automates billing, and integrates an AI agent for smarter dispatching — all deployed as Docker containers.

---

## 1. Repository Structure (Monorepo — pnpm + Turborepo)

```
transvirex/
├── apps/
│   ├── driver/          # React + TS, port 3001 (mobile-responsive)
│   ├── dispatcher/      # React + TS, port 3002
│   ├── billing/         # React + TS, port 3003
│   └── management/      # React + TS, port 3004
├── services/
│   ├── gateway/         # Express + TS, port 4000
│   ├── auth/            # Express + TS, port 4001
│   ├── mission/         # Express + TS, port 4002
│   ├── billing-svc/     # Express + TS, port 4003
│   ├── ai/              # Express + TS + TF.js, port 4004
│   └── notification/    # Express + Socket.IO + TS, port 4005
├── packages/
│   └── shared/          # TypeScript types + Axios API client
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (4 React apps)                │
│  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐   │
│  │  Driver  │ │ Dispatcher │ │ Billing │ │ Mgmt/KPI │   │
│  │  :3001   │ │   :3002    │ │  :3003  │ │  :3004   │   │
│  └────┬─────┘ └─────┬──────┘ └────┬────┘ └────┬─────┘   │
└───────┼─────────────┼─────────────┼────────────┼─────────┘
        └─────────────┴──────┬───────┴────────────┘
                             │  All HTTP → single endpoint
                   ┌─────────▼─────────┐       ┌──────────────────┐
                   │    API GATEWAY     │       │  Notification Svc │
                   │  (JWT + Routing)   │       │  Socket.IO :4005  │
                   └─────────┬──────────┘       └──────────────────┘
         ┌───────────┬────────┴──────────┬──────────┐
         │           │                   │          │
  ┌──────▼──────┐ ┌──▼──────────┐ ┌─────▼────┐ ┌───▼──────┐
  │ Auth Svc   │ │ Mission Svc │ │ Billing  │ │ AI Svc   │
  │  :4001     │ │   :4002     │ │ Svc:4003 │ │  :4004   │
  └──────┬──────┘ └──┬─────┬───┘ └─────┬────┘ └──────────┘
         │           │     │           │
    ┌────▼──┐  ┌─────▼┐  ┌─▼────┐  ┌──▼────┐
    │  PG   │  │  PG  │  │Mongo │  │  PG   │
    │ users │  │ miss.│  │events│  │ inv.  │
    └───────┘  └──────┘  └──────┘  └───────┘
```

### Microservices

| Service | Port | Responsibility | Database |
|---|---|---|---|
| **gateway** | 4000 | Single entry point, JWT validation, request routing | — |
| **auth** | 4001 | Login, register, JWT issuance, user + driver CRUD | PostgreSQL |
| **mission** | 4002 | Mission lifecycle, assignment, status tracking | PostgreSQL + MongoDB |
| **billing-svc** | 4003 | Invoice generation, payment tracking | PostgreSQL |
| **ai** | 4004 | TF.js neural network for smart driver assignment | — |
| **notification** | 4005 | Socket.IO hub: status events + dispatcher↔driver chat | MongoDB |

### Normalized Message Contract (SRS requirement)

```typescript
interface ApiResponse<T> {
  status: 'success' | 'failure' | 'pending';
  data?: T;
  error?: { code: string; message: string };
  timestamp: string;
}
```

---

## 3. Data Model

### PostgreSQL

```
users:   id, email, password_hash, role, name, phone, created_at
drivers: id, user_id (FK), vehicle_type, lat, lng, status, current_load, acceptance_rate, experience_days
missions: id, client_name, pickup_address, pickup_lat, pickup_lng,
          delivery_address, delivery_lat, delivery_lng, deadline,
          status, driver_id (FK), created_by (FK), created_at
invoices: id, mission_id (FK), client_name, amount, status, generated_at, paid_at
payments: id, invoice_id (FK), amount, payment_date, method
```

### MongoDB

```
delivery_events: { mission_id, driver_id, status, location:{lat,lng}, timestamp, notes }
messages:        { conversation_id, sender_id, receiver_id, mission_id, content, timestamp, read }
notifications:   { user_id, message, type, read, created_at }
```

---

## 4. Frontend Apps & User Flows

### Shared Auth Flow
```
POST /auth/login → JWT stored in localStorage →
axios interceptor attaches Bearer token → Gateway validates → ApiResponse<T>
```

### Driver App (:3001) — mobile-first responsive
```
Login → My Missions (list) → Mission Detail → [Accept/Refuse] →
Update Status (picked_up/delivered/incident) → History | Live Chat
```

### Dispatcher App (:3002)
```
Login → Mission Board (Kanban) → Create Mission →
AI Suggestion Panel → [Accept/Manual assign] → Status feed (WebSocket) → Chat
```

### Billing App (:3003)
```
Login → Completed Deliveries → Generate Invoice →
Invoice List (draft/sent/paid) → Mark Paid → Export PDF
```

### Management Dashboard (:3004)
```
Login → KPI Overview → Driver Performance table → Charts (recharts)
```

---

## 5. Notification Service — Real-Time WebSocket (Socket.IO)

### Socket.IO Events

```typescript
// Server → Client
'mission:assigned'  // driver receives new mission
'mission:status'    // dispatcher receives status update
'message:received'  // chat message
'alert:delay'       // delay alert to dispatcher

// Client → Server
'message:send'      // { to: userId, content: string, missionId: string }
```

### Auth
JWT token in Socket.IO `auth` header. Service validates and stores `socketId ↔ userId`.

### Internal emit endpoint
Other services POST to `http://notification-svc:4005/emit` to push events to clients.

### Driver App — Mobile Design
- Large touch targets, bottom navigation bar
- Leaflet.js map (OpenStreetMap, free) for mission location
- Live chat panel with dispatcher

---

## 6. AI Agent — TensorFlow.js Neural Network

### Model
```
Input (7 features): [distance_km, current_load, acceptance_rate,
                     experience_days, urgency, time_of_day, zone_match]
Hidden: Dense(16, relu) → Dense(8, relu)
Output: Dense(1, sigmoid) → success_probability
```

### Training
~2000 synthetic labelled samples, trained on service startup.

### Endpoint
```
POST /ai/suggest-assignment
Body: { missionId }
Response: ApiResponse<{ suggestions: Array<{ driverId, name, score, features }> }>
```

---

## 7. Docker Deployment

14 containers: 2 DBs + 6 services + 4 frontend apps + 2 DBs (already counted).

- Only gateway (:4000), notification (:4005), and 4 frontend apps are externally port-mapped
- All other backend services are Docker-internal only
- Multi-stage Dockerfiles (build → slim runtime)
- `depends_on` + healthchecks on DBs

---

## 8. Verification Sequence

1. `docker-compose up --build` — all 14 containers healthy
2. Driver App → register, login, see empty mission list
3. Dispatcher App → create mission, get AI suggestions, assign to driver
4. Driver App → mission appears (WebSocket), accept, update to delivered
5. Billing App → see completed mission, generate invoice, mark paid
6. Management App → KPIs updated
7. MongoDB has `delivery_events` documents
8. PostgreSQL `missions` table shows `status = completed`
9. AI → POST `/ai/suggest-assignment` returns ranked list with scores
10. WebSocket → chat message from dispatcher received on driver app in real time
