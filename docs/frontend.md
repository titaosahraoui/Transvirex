# Frontend Apps

Four role-specific React apps (Vite + React 18). Each registers with a hardcoded `role` string and only exposes functionality relevant to that role.

All apps share the same patterns:
- `AuthContext.tsx` — provides `user`, `token`, `login()`, `register()`, `logout()`. Creates an `axios` instance (`api`) with `VITE_GATEWAY_URL` as `baseURL` and injects the JWT via a request interceptor.
- `ProtectedRoute` — redirects to `/login` if unauthenticated.

---

## Management app — port 3000

Role: `management`

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage` | Login |
| `/register` | `RegisterPage` | Register with role `management` |
| `/dashboard` | `DashboardPage` | KPIs: mission counts, revenue, driver stats |
| `/drivers` | `DriversPage` | List drivers, create driver profiles |
| `/users` | `UsersPage` | List all platform users |
| `/missions/:id` | `MissionDetailPage` | Read-only mission detail with map |

---

## Driver app — port 3001

Role: `driver`

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage` | Login |
| `/register` | `RegisterPage` | Register with role `driver` |
| `/missions` | `MissionsPage` | List of missions assigned to the logged-in driver |
| `/missions/:id` | `MissionDetailPage` | Accept/reject/complete a mission; embedded Leaflet map; live GPS sharing |
| `/chat` | `ChatPage` | Messaging with dispatcher (Socket.IO) |

**GPS tracking:** When a mission is `in_progress`, the driver app uses `navigator.geolocation.watchPosition` to stream coordinates via `PATCH /missions/:id/location` and emits them through the Socket.IO `driver:location` event.

---

## Dispatcher app — port 3002

Role: `dispatcher`

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage` | Login |
| `/register` | `RegisterPage` | Register with role `dispatcher` |
| `/board` | `BoardPage` | Kanban board: missions grouped by status |
| `/missions/new` | `NewMissionPage` | Create mission; interactive Leaflet map for pickup/delivery placement |
| `/missions/:id` | `MissionDetailPage` | Full detail: assign/reassign/cancel; live driver tracking map with GPS history polyline |
| `/drivers` | `DriversPage` | List of drivers + AI assignment suggestions |
| `/chat` | `ChatPage` | Messaging with drivers (Socket.IO) |
| `/alerts` | `AlertsPage` | Incidents, overdue missions, live status feed, SLA stats |

**Map in NewMissionPage:** Click the map to place pickup (📍) or delivery (🏁) markers. Two pill-buttons toggle which marker the next click sets. Nominatim reverse-geocodes the clicked coordinates into a human-readable address (auto-fills the address inputs).

**Live tracking in MissionDetailPage:** For `assigned` or `in_progress` missions, shows a Leaflet map with the pickup marker, delivery marker, historical GPS polyline (amber), and a live driver marker (🚐) updated in real time via `driver:location` Socket.IO events.

---

## Billing app — port 3003

Role: `billing`

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage` | Login |
| `/register` | `RegisterPage` | Register with role `billing` |
| `/invoices` | `InvoicesPage` | List invoices; create invoice modal with mission auto-fill |
| `/payments` | `PaymentsPage` | Record payments against invoices |

**Mission auto-fill:** In the create-invoice modal, entering a `missionId` of 8+ characters triggers a 600 ms debounced request to `GET /missions/:id`. If found, `clientName` and `amount` are pre-filled automatically.
