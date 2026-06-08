# API — Billing Service

All routes are accessed through the gateway at `http://localhost:4000/billing`. JWT required for all.

---

## Invoice state machine

```
draft → sent → paid
```

---

## Invoices

### List invoices

```
GET /billing/invoices
```

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (`draft`/`sent`/`paid`) |

---

### Get invoice by ID

```
GET /billing/invoices/:id
```

**Response data:**
```json
{
  "id": "uuid",
  "missionId": "uuid",
  "clientName": "Mme Lefèvre",
  "amount": "3500.00",
  "status": "sent",
  "dueDate": "2026-07-07T00:00:00Z",
  "createdAt": "2026-06-07T...",
  "updatedAt": "2026-06-07T..."
}
```

`amount` is returned as a string (PostgreSQL DECIMAL). Use `parseFloat()` before arithmetic.

---

### Create invoice

```
POST /billing/invoices
```

**Body:**
```json
{
  "missionId": "uuid",
  "clientName": "Mme Lefèvre",
  "amount": 3500,
  "dueDate": "2026-07-07"
}
```

`dueDate` is optional. Created with status `draft`.

When typed in the billing app's modal, entering a valid `missionId` (≥ 8 chars) auto-fetches the mission and pre-fills `clientName` and `amount` after a 600 ms debounce.

---

### Update invoice status

```
PATCH /billing/invoices/:id/status
```

**Body:**
```json
{ "status": "sent" }
```

Valid transitions: `draft` → `sent` → `paid`.

---

## Payments

### List payments

```
GET /billing/payments
```

---

### Record payment

```
POST /billing/payments
```

**Body:**
```json
{
  "invoiceId": "uuid",
  "amount": 3500,
  "method": "virement"
}
```

`method` is a free-form string (e.g. `espèces`, `virement`, `chèque`).

---

## Stats

### Billing stats

```
GET /billing/stats
```

**Response data:**
```json
{
  "totalRevenue": "125000.00",
  "pendingRevenue": "12000.00",
  "paidCount": 80,
  "draftCount": 5,
  "sentCount": 15
}
```
