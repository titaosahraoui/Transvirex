# API — Mission Service

All routes are accessed through the gateway at `http://localhost:4000/missions`. JWT required for all.

---

## Mission state machine

```
pending ──────────────────────────────────────────────────────── cancelled
   │                                                                  ↑
   └─→ assigned ──────────────────────────────────────────────── cancelled
           │              ↑
           ├─→ pending    (driver rejects via /reject)
           │
           └─→ in_progress ──→ completed   (completed_at is set)
                           └──→ failed
```

**Priority values:** `low` | `medium` | `high` | `urgent`

**Mission types:** `standard` | `express` | `lourd` | `fragile`

---

## Endpoints

### List missions

```
GET /missions
```

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (e.g. `pending`, `in_progress`) |
| `driverId` | string | Filter by assigned driver UUID |
| `priority` | string | Filter by priority (`low`/`medium`/`high`/`urgent`) |
| `missionType` | string | Filter by type (`standard`/`express`/`lourd`/`fragile`) |
| `search` | string | ILIKE search on `clientName`, `pickupAddress`, `deliveryAddress` |
| `sort` | string | `newest` (default) \| `oldest` \| `deadline` \| `price` |
| `page` | number | Page number, 1-based (default: 1) |
| `limit` | number | Items per page (default: 20) |

**Response data:**
```json
{
  "items": [ /* Mission[] */ ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### Mission stats

```
GET /missions/stats
```

Returns aggregated counts and KPIs for the dashboard. Must be registered before `GET /missions/:id` in the router to avoid Express treating "stats" as an ID.

**Response data:**
```json
{
  "totalCount": 100,
  "pendingCount": 10,
  "inProgressCount": 5,
  "completedCount": 80,
  "failedCount": 3,
  "cancelledCount": 2,
  "overdueCount": 1,
  "slaPercent": 94,
  "totalRevenue": "125000.00"
}
```

`slaPercent` = percentage of completed missions where `completed_at <= deadline`.

---

### Get mission by ID

```
GET /missions/:id
```

**Response data — full mission object:**
```json
{
  "id": "uuid",
  "clientName": "Mme Lefèvre",
  "pickupAddress": "12 Rue Didouche Mourad, Alger",
  "pickupLat": 36.7538,
  "pickupLng": 3.0588,
  "deliveryAddress": "45 Bd Zighout Youcef, Alger",
  "deliveryLat": 36.7700,
  "deliveryLng": 3.0800,
  "status": "in_progress",
  "driverId": "uuid or null",
  "deadline": "2026-06-08T14:00:00Z",
  "price": "3500.00",
  "missionType": "express",
  "weightKg": "12.5",
  "notes": "Colis fragile",
  "priority": "high",
  "completedAt": null,
  "rejectedReason": null,
  "createdAt": "2026-06-07T10:00:00Z",
  "updatedAt": "2026-06-07T11:30:00Z"
}
```

---

### Create mission

```
POST /missions
```

**Body:**
```json
{
  "clientName": "Mme Lefèvre",
  "pickupAddress": "12 Rue Didouche Mourad, Alger",
  "pickupLat": 36.7538,
  "pickupLng": 3.0588,
  "deliveryAddress": "45 Bd Zighout Youcef, Alger",
  "deliveryLat": 36.7700,
  "deliveryLng": 3.0800,
  "deadline": "2026-06-08T14:00:00Z",
  "price": 3500,
  "missionType": "express",
  "weightKg": 12.5,
  "notes": "Colis fragile",
  "priority": "high"
}
```

All coordinate and optional fields may be omitted. Returns the created mission object.

---

### Update mission fields

```
PATCH /missions/:id
```

Body may contain any subset of: `clientName`, `pickupAddress`, `deliveryAddress`, `deadline`, `price`, `missionType`, `weightKg`, `notes`, `priority`.

---

### Assign mission to driver

```
PATCH /missions/:id/assign
```

**Body:**
```json
{ "driverId": "uuid" }
```

Transitions status: `pending` → `assigned`. Notifies the driver via Socket.IO (`mission:assigned`).

---

### Reassign mission

```
PATCH /missions/:id/reassign
```

**Body:**
```json
{ "driverId": "uuid" }
```

Changes the assigned driver while keeping status `assigned`.

---

### Cancel mission

```
PATCH /missions/:id/cancel
```

No body. Transitions status to `cancelled`. Notifies the assigned driver if any.

---

### Update mission status (driver actions)

```
PATCH /missions/:id/status
```

**Body:**
```json
{ "status": "in_progress" }
```

Valid driver transitions:
- `assigned` → `in_progress` (driver accepts)
- `in_progress` → `completed` (sets `completed_at = NOW()`)
- `in_progress` → `failed`

Emits `mission:status` Socket.IO event to the dispatcher.

---

### Reject mission (driver)

```
PATCH /missions/:id/reject
```

**Body:**
```json
{ "reason": "Trop chargé" }
```

Transitions: `assigned` → `pending`, clears `driverId`, stores `rejectedReason`. Creates a MongoDB `delivery_event` with status `rejected`. Notifies the dispatcher.

---

### Update driver location

```
PATCH /missions/:id/location
```

**Body:**
```json
{ "lat": 36.7538, "lng": 3.0588 }
```

Stores a GPS ping as a MongoDB `delivery_event`. Emits `driver:location` to all connected sockets via the notification service.

---

### Get delivery events

```
GET /missions/:id/events
```

Returns all MongoDB `delivery_events` for the mission in chronological order (status changes + GPS pings).

---

### Get location history

```
GET /missions/:id/location-history
```

Returns only GPS ping events (non-zero lat/lng) sorted by timestamp ascending. Used by the dispatcher's live tracking map.

**Response data:**
```json
[
  { "lat": 36.7538, "lng": 3.0588, "timestamp": "2026-06-07T11:00:00Z" },
  { "lat": 36.7600, "lng": 3.0650, "timestamp": "2026-06-07T11:05:00Z" }
]
```
