# API — Notification Service

The notification service runs on port 4005 and is **not** behind the gateway. Frontends connect to it directly.

---

## HTTP endpoints

### Health

```
GET http://localhost:4005/health
```

Returns `{ service: "notification", uptime: ..., connectedUsers: N }`.

---

### Push event to a user

```
POST http://localhost:4005/emit
```

Called by other microservices (e.g. mission service after a status change) to push a Socket.IO event to a specific connected user.

**Body:**
```json
{
  "event": "mission:assigned",
  "userId": "uuid",
  "data": { "missionId": "uuid" }
}
```

Always returns HTTP 200. `delivered: false` means the user was offline and the event was dropped.

```json
{ "status": "success", "data": { "delivered": true } }
```

---

## Socket.IO

### Connecting

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:4005', {
  auth: { token: localStorage.getItem('token') }
});
```

The server verifies the JWT during the handshake. Connection is rejected if the token is missing or invalid.

---

### Client → Server events

#### `message:send`

Send a chat message to another user.

**Payload:**
```json
{
  "to": "recipient-user-id",
  "content": "En route, 10 minutes.",
  "missionId": "uuid"
}
```

`missionId` is optional — used to scope messages to a specific delivery.

The server stores the message in MongoDB (with a `conversationId` = sorted join of both user IDs), then:
- Emits `message:received` to the recipient if online
- Emits `message:delivered` back to the sender as confirmation

---

#### `driver:location`

Driver pushes a live GPS position.

**Payload:**
```json
{
  "missionId": "uuid",
  "lat": 36.7538,
  "lng": 3.0588
}
```

The server broadcasts `driver:location` to all other connected sockets with `driverId` appended.

---

### Server → Client events

#### `mission:assigned`

Sent to a driver when a new mission is assigned to them.

**Payload:**
```json
{ "missionId": "uuid" }
```

---

#### `mission:status`

Sent to the dispatcher when a mission status changes or a GPS location arrives.

**Payload (status change):**
```json
{ "missionId": "uuid", "status": "in_progress" }
```

**Payload (location update from mission service):**
```json
{ "missionId": "uuid", "lat": 36.7538, "lng": 3.0588 }
```

---

#### `driver:location`

Broadcast to all connected sockets (dispatchers pick this up) when a driver emits their GPS position.

**Payload:**
```json
{ "missionId": "uuid", "lat": 36.7538, "lng": 3.0588, "driverId": "uuid" }
```

---

#### `message:received`

Delivered to the recipient of a chat message.

**Payload:**
```json
{
  "id": "mongo-object-id",
  "conversationId": "userId1_userId2",
  "senderId": "uuid",
  "content": "En route.",
  "missionId": "uuid",
  "timestamp": "2026-06-07T..."
}
```

---

#### `message:delivered`

Sent back to the message sender as write confirmation.

**Payload:**
```json
{ "messageId": "mongo-object-id" }
```

---

#### `alert:delay`

Sent to the dispatcher when a mission exceeds its deadline. Emitted by the mission service via `POST /emit`.

**Payload:**
```json
{ "missionId": "uuid", "deadline": "2026-06-07T14:00:00Z" }
```

---

## Production notes

The in-memory `userSocketMap` is not shared across Node.js processes. A Redis Socket.IO adapter would be required for horizontal scaling.
