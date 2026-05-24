/**
 * Mission service tests
 * - pg pool is fully mocked — no real DB calls
 * - mongoose DeliveryEvent is mocked — no real Mongo calls
 */

// ── Mock pg ──────────────────────────────────────────────────────────────────
const mockQuery = jest.fn();
jest.mock('../db/postgres', () => ({
  pool: { query: mockQuery },
  initSchema: jest.fn().mockResolvedValue(undefined),
}));

// ── Mock mongoose DeliveryEvent ──────────────────────────────────────────────
const mockFind = jest.fn();
const mockCreate = jest.fn();
jest.mock('../db/mongo', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
  DeliveryEvent: {
    find: mockFind,
    create: mockCreate,
  },
}));

import request from 'supertest';
import app from '../app';

// Helper: inject x-user-* headers (simulates gateway)
function withUser(
  req: request.Test,
  opts: { userId?: string; role?: string; email?: string } = {}
): request.Test {
  return req
    .set('x-user-id',    opts.userId ?? 'user-123')
    .set('x-user-role',  opts.role   ?? 'dispatcher')
    .set('x-user-email', opts.email  ?? 'test@test.com');
}

// Sample mission row (matches the RETURNING alias in the controller)
const sampleMission = {
  id: 'mission-uuid',
  clientName: 'Acme Corp',
  pickupAddress: '10 Pickup St',
  pickupLat: '36.7',
  pickupLng: '3.0',
  deliveryAddress: '20 Delivery Ave',
  deliveryLat: '36.8',
  deliveryLng: '3.1',
  deadline: null,
  status: 'pending',
  driverId: null,
  createdBy: 'user-123',
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Health ────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with service name', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.service).toBe('mission');
  });
});

// ── requireUser middleware ────────────────────────────────────────────────────
describe('requireUser middleware', () => {
  it('GET /missions returns 401 without x-user-* headers', async () => {
    const res = await request(app).get('/missions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

// ── GET /missions ─────────────────────────────────────────────────────────────
describe('GET /missions', () => {
  it('returns all missions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleMission] });
    const res = await withUser(request(app).get('/missions'));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].clientName).toBe('Acme Corp');
  });

  it('accepts status query filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).get('/missions?status=pending'));
    expect(res.status).toBe(200);
    // The query should have been called with the status value
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status'),
      expect.arrayContaining(['pending'])
    );
  });
});

// ── GET /missions/:id ─────────────────────────────────────────────────────────
describe('GET /missions/:id', () => {
  it('returns the mission when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleMission] });
    const res = await withUser(request(app).get('/missions/mission-uuid'));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('mission-uuid');
  });

  it('returns 404 when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).get('/missions/nonexistent'));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── POST /missions ────────────────────────────────────────────────────────────
describe('POST /missions', () => {
  const validBody = {
    clientName: 'Acme Corp',
    pickupAddress: '10 Pickup St',
    deliveryAddress: '20 Delivery Ave',
  };

  it('creates a mission and returns 201', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleMission] });
    const res = await withUser(request(app).post('/missions')).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.data.clientName).toBe('Acme Corp');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await withUser(request(app).post('/missions')).send({
      clientName: 'Acme Corp',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });
});

// ── PATCH /missions/:id/assign ────────────────────────────────────────────────
describe('PATCH /missions/:id/assign', () => {
  it('assigns a driver to a pending mission', async () => {
    // First query: check current status
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'pending' }] });
    // Second query: UPDATE
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...sampleMission, status: 'assigned', driverId: 'driver-abc' }],
    });

    const res = await withUser(request(app).patch('/missions/mission-uuid/assign')).send({
      driverId: 'driver-abc',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('assigned');
    expect(res.body.data.driverId).toBe('driver-abc');
  });

  it('returns 400 when driverId is missing', async () => {
    const res = await withUser(request(app).patch('/missions/mission-uuid/assign')).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 404 when mission not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).patch('/missions/nope/assign')).send({
      driverId: 'driver-abc',
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when mission is not pending', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'completed' }] });
    const res = await withUser(request(app).patch('/missions/mission-uuid/assign')).send({
      driverId: 'driver-abc',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

// ── PATCH /missions/:id/status ────────────────────────────────────────────────
describe('PATCH /missions/:id/status', () => {
  it('accepts assigned → in_progress transition', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'assigned', driver_id: 'driver-abc' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'in_progress' }] });
    mockCreate.mockResolvedValueOnce({});

    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'in_progress',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('accepts in_progress → completed transition', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'in_progress', driver_id: 'driver-abc' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'completed' }] });
    mockCreate.mockResolvedValueOnce({});

    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'completed',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('accepts assigned → pending (driver refusal)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'assigned', driver_id: 'driver-abc' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'pending', driverId: null }] });

    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'pending',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending');
  });

  it('rejects pending → completed (invalid transition)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'pending', driver_id: null }] });
    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'completed',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 400 for an invalid status value', async () => {
    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'teleported',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('returns 404 when mission not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).patch('/missions/nope/status')).send({
      status: 'in_progress',
    });
    expect(res.status).toBe(404);
  });
});

// ── GET /missions/:id/events ──────────────────────────────────────────────────
describe('GET /missions/:id/events', () => {
  it('returns delivery events from MongoDB', async () => {
    const fakeSort = jest.fn().mockResolvedValueOnce([
      { mission_id: 'mission-uuid', status: 'in_progress', timestamp: new Date() },
    ]);
    mockFind.mockReturnValueOnce({ sort: fakeSort });

    const res = await withUser(request(app).get('/missions/mission-uuid/events'));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(mockFind).toHaveBeenCalledWith({ mission_id: 'mission-uuid' });
  });
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-xyz');
    expect(res.status).toBe(404);
  });
});
