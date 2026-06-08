# API — Auth Service

All routes are accessed through the gateway at `http://localhost:4000`.

---

## Public routes (no JWT required)

### Register

```
POST /auth/register
```

**Body:**
```json
{
  "name": "Alice Dupont",
  "email": "alice@example.com",
  "password": "secret123",
  "role": "dispatcher"
}
```

Valid roles: `management`, `dispatcher`, `driver`, `billing`

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "<jwt>",
    "user": { "id": "uuid", "name": "Alice Dupont", "email": "...", "role": "dispatcher" }
  }
}
```

---

### Login

```
POST /auth/login
```

**Body:**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response:** same shape as register.

---

## Protected routes (JWT required)

### Get current user

```
GET /auth/me
```

Returns the user object for the authenticated caller (resolved from `x-user-id` header injected by the gateway).

---

## Driver management

Drivers are user accounts with role `driver` that have an associated driver profile (vehicle, zone, etc.).

### List drivers

```
GET /drivers
```

Returns array of all driver profiles.

---

### Get driver by ID

```
GET /drivers/:id
```

---

### Get driver by user ID

```
GET /drivers/by-user/:userId
```

---

### Update driver

```
PATCH /drivers/:id
```

**Body** (all fields optional):
```json
{
  "licenseNumber": "AB-1234",
  "vehicleType": "van",
  "vehiclePlate": "16-ALG-001",
  "zone": "Alger-Centre",
  "isAvailable": true
}
```

---

## User lookup

### Get user by ID

```
GET /users/:id
```

Used internally by services to resolve user info.
