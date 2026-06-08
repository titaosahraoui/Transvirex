# API — AI Service

All routes are accessed through the gateway at `http://localhost:4000/ai`. JWT required for all.

The AI service uses a TensorFlow.js neural network to rank drivers for a given mission. The model is trained from scratch on 2,000 synthetic samples at service startup and cached as a singleton.

---

## Suggest driver assignment

```
POST /ai/suggest-assignment
```

**Body:**
```json
{
  "missionId": "uuid",
  "drivers": [
    {
      "id": "uuid",
      "lat": 36.7538,
      "lng": 3.0588,
      "currentLoad": 1,
      "acceptanceRate": 0.95,
      "experienceYears": 3,
      "zone": "Alger-Centre"
    }
  ]
}
```

**Input features per driver (7 total):**

| Feature | Description |
|---------|-------------|
| `lat`, `lng` | Driver's current GPS position (distance to pickup is computed server-side) |
| `currentLoad` | Number of active missions currently assigned |
| `acceptanceRate` | Historical ratio of accepted missions (0–1) |
| `experienceYears` | Years of driving experience |
| `zone` | Driver's assigned zone (matched against mission zone) |

**Response data:**
```json
{
  "missionId": "uuid",
  "ranked": [
    { "driverId": "uuid", "score": 0.92 },
    { "driverId": "uuid", "score": 0.74 }
  ]
}
```

Drivers are sorted by score descending. Higher score = better fit. The dispatcher chooses the final assignment.

---

## Model info

```
GET /ai/model-info
```

**Response data:**
```json
{
  "features": ["distance", "load", "acceptanceRate", "experienceYears", "urgency", "timeOfDay", "zoneMatch"],
  "trainingSamples": 2000,
  "epochs": 50,
  "status": "ready"
}
```

`status` is `"training"` during the initial training phase and `"ready"` once the model is usable.
