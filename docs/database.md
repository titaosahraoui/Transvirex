# Database Schemas

## PostgreSQL

Managed by `services/auth`, `services/mission`, and `services/billing-svc`. Schemas are created idempotently via `initSchema()` at service startup — no migration tool required.

---

### auth service

#### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, `gen_random_uuid()` |
| `name` | TEXT | Not null |
| `email` | TEXT | Unique, not null |
| `password_hash` | TEXT | bcrypt hash |
| `role` | TEXT | `management` \| `dispatcher` \| `driver` \| `billing` |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

#### `drivers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users.id` |
| `license_number` | TEXT | |
| `vehicle_type` | TEXT | e.g. `van`, `truck`, `moto` |
| `vehicle_plate` | TEXT | |
| `zone` | TEXT | Assigned delivery zone |
| `is_available` | BOOLEAN | Default `true` |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

---

### mission service

#### `missions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `client_name` | TEXT | Not null |
| `pickup_address` | TEXT | Not null |
| `pickup_lat` | DECIMAL | Optional, 0 if not set |
| `pickup_lng` | DECIMAL | Optional, 0 if not set |
| `delivery_address` | TEXT | Not null |
| `delivery_lat` | DECIMAL | Optional, 0 if not set |
| `delivery_lng` | DECIMAL | Optional, 0 if not set |
| `status` | TEXT | State machine — see [missions API](./api/missions.md) |
| `driver_id` | UUID | Nullable — set when assigned |
| `deadline` | TIMESTAMPTZ | Nullable |
| `price` | DECIMAL | Default 0 |
| `mission_type` | TEXT | `standard` \| `express` \| `lourd` \| `fragile` |
| `weight_kg` | DECIMAL | Default 0 |
| `notes` | TEXT | Optional instructions |
| `priority` | TEXT | `low` \| `medium` \| `high` \| `urgent` |
| `completed_at` | TIMESTAMPTZ | Set when status → `completed`; used for SLA calculation |
| `rejected_reason` | TEXT | Set when driver rejects the mission |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

`DECIMAL` columns are returned as strings by the `pg` driver. Use `parseFloat()` before arithmetic in frontend code.

---

### billing service

#### `invoices`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `mission_id` | UUID | Reference to a mission (not a FK — cross-service) |
| `client_name` | TEXT | Not null |
| `amount` | DECIMAL | |
| `status` | TEXT | `draft` \| `sent` \| `paid` |
| `due_date` | TIMESTAMPTZ | Nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

#### `payments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `invoice_id` | UUID | FK → `invoices.id` |
| `amount` | DECIMAL | |
| `method` | TEXT | Free-form (e.g. `virement`, `espèces`) |
| `paid_at` | TIMESTAMPTZ | Default `NOW()` |

---

## MongoDB

### mission service — `delivery_events` collection

Documents created for each status change and GPS ping on a mission.

| Field | Type | Notes |
|-------|------|-------|
| `missionId` | string | UUID of the mission |
| `status` | string | Mission status at time of event, or `location` for GPS pings |
| `lat` | number | GPS latitude (0 if not a location event) |
| `lng` | number | GPS longitude (0 if not a location event) |
| `timestamp` | Date | Event time |
| `driverId` | string | Driver who triggered the event |
| `note` | string | Optional human-readable note |

---

### notification service — `messages` collection

Chat messages exchanged between dispatchers and drivers.

| Field | Type | Notes |
|-------|------|-------|
| `conversationId` | string | Sorted join of both user IDs: `"userId1_userId2"` |
| `senderId` | string | User UUID |
| `receiverId` | string | User UUID |
| `missionId` | string | Optional — scope to a specific mission |
| `content` | string | Message text |
| `timestamp` | Date | Default `Date.now` |
| `delivered` | boolean | Whether the recipient was online at send time |
