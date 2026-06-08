/**
 * Mission service tests
 * - pg pool is fully mocked — no real DB calls
 * - mongoose DeliveryEvent is mocked — no real Mongo calls
 * - axios is mocked — no real HTTP calls to auth/notification services
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

// ── Mock axios (auth service lookups + notification posts) ────────────────────
const mockAxiosGet  = jest.fn();
const mockAxiosPost = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: { get: mockAxiosGet, post: mockAxiosPost },
  get:  mockAxiosGet,
  post: mockAxiosPost,
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
  // Default axios responses so existing tests don't break
  mockAxiosGet.mockResolvedValue({ data: { data: { userId: 'driver-user-uuid' } } });
  mockAxiosPost.mockResolvedValue({ data: { status: 'success', data: { delivered: true } } });
  mockCreate.mockResolvedValue({});
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
  it('returns paginated missions with items/total/page/limit/totalPages', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });           // COUNT query
    mockQuery.mockResolvedValueOnce({ rows: [sampleMission] });            // SELECT query
    const res = await withUser(request(app).get('/missions'));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].clientName).toBe('Acme Corp');
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
    expect(res.body.data.totalPages).toBe(1);
  });

  it('accepts status query filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).get('/missions?status=pending'));
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status'),
      expect.arrayContaining(['pending'])
    );
  });

  it('respects page and limit params', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] });
    mockQuery.mockResolvedValueOnce({ rows: [sampleMission, { ...sampleMission, id: 'mission-2' }] });
    const res = await withUser(request(app).get('/missions?page=1&limit=2'));
    expect(res.status).toBe(200);
    expect(res.body.data.limit).toBe(2);
    expect(res.body.data.totalPages).toBe(5);
  });

  it('accepts from and to date range filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(
      request(app).get('/missions?from=2026-01-01&to=2026-12-31')
    );
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('created_at'),
      expect.arrayContaining(['2026-01-01', '2026-12-31'])
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
  const assignedMission = {
    ...sampleMission,
    status: 'assigned',
    driverId: 'driver-abc',
    pickupAddress: '10 Pickup St',
    deliveryAddress: '20 Delivery Ave',
  };

  it('assigns a driver to a pending mission', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'pending' }] });
    mockQuery.mockResolvedValueOnce({ rows: [assignedMission] });

    const res = await withUser(request(app).patch('/missions/mission-uuid/assign')).send({
      driverId: 'driver-abc',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('assigned');
    expect(res.body.data.driverId).toBe('driver-abc');
  });

  it('fires mission:assigned notification to driver after assignment', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'pending' }] });
    mockQuery.mockResolvedValueOnce({ rows: [assignedMission] });
    mockAxiosGet.mockResolvedValueOnce({ data: { data: { userId: 'driver-user-uuid' } } });

    await withUser(request(app).patch('/missions/mission-uuid/assign')).send({
      driverId: 'driver-abc',
    });

    await new Promise(r => setTimeout(r, 50));

    expect(mockAxiosGet).toHaveBeenCalledWith(
      expect.stringContaining('/drivers/driver-abc'),
      expect.any(Object)
    );
    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/emit'),
      expect.objectContaining({ event: 'mission:assigned', userId: 'driver-user-uuid' }),
      expect.any(Object)
    );
  });

  it('still returns 200 when notification service is down', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'pending' }] });
    mockQuery.mockResolvedValueOnce({ rows: [assignedMission] });
    mockAxiosGet.mockRejectedValueOnce(new Error('notification service down'));

    const res = await withUser(request(app).patch('/missions/mission-uuid/assign')).send({
      driverId: 'driver-abc',
    });
    expect(res.status).toBe(200);
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

// ── PATCH /missions/:id/cancel ────────────────────────────────────────────────
describe('PATCH /missions/:id/cancel', () => {
  it('cancels a pending mission (no driver to notify)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'pending', driver_id: null, created_by: 'user-123' }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'mission-uuid', clientName: 'Acme Corp', status: 'cancelled', driverId: null, createdAt: new Date().toISOString() }],
    });

    const res = await withUser(request(app).patch('/missions/mission-uuid/cancel'));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('cancels an assigned mission and notifies the driver', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'assigned', driver_id: 'driver-abc', created_by: 'user-123' }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'mission-uuid', clientName: 'Acme Corp', status: 'cancelled', driverId: null, createdAt: new Date().toISOString() }],
    });
    mockAxiosGet.mockResolvedValueOnce({ data: { data: { userId: 'driver-user-uuid' } } });

    const res = await withUser(request(app).patch('/missions/mission-uuid/cancel'));
    expect(res.status).toBe(200);

    await new Promise(r => setTimeout(r, 50));

    expect(mockAxiosGet).toHaveBeenCalledWith(
      expect.stringContaining('/drivers/driver-abc'),
      expect.any(Object)
    );
    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/emit'),
      expect.objectContaining({ event: 'mission:status', userId: 'driver-user-uuid' }),
      expect.any(Object)
    );
  });

  it('returns 409 when mission is in_progress', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'in_progress', driver_id: 'driver-abc', created_by: 'user-123' }],
    });

    const res = await withUser(request(app).patch('/missions/mission-uuid/cancel'));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 404 when mission not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).patch('/missions/nope/cancel'));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── PATCH /missions/:id/status ────────────────────────────────────────────────
describe('PATCH /missions/:id/status', () => {
  it('accepts assigned → in_progress transition', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'assigned', driver_id: 'driver-abc', created_by: 'user-123' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'in_progress' }] });

    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'in_progress',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('accepts in_progress → completed transition', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'in_progress', driver_id: 'driver-abc', created_by: 'user-123' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'completed' }] });

    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'completed',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('accepts assigned → pending (driver refusal)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'assigned', driver_id: 'driver-abc', created_by: 'user-123' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'pending', driverId: null }] });

    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'pending',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending');
  });

  it('notifies dispatcher (created_by) on status change', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'assigned', driver_id: 'driver-abc', created_by: 'dispatcher-xyz' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'in_progress' }] });

    await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'in_progress',
    });

    await new Promise(r => setTimeout(r, 50));

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/emit'),
      expect.objectContaining({ event: 'mission:status', userId: 'dispatcher-xyz' }),
      expect.any(Object)
    );
  });

  it('still returns 200 when notification service is down', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'in_progress', driver_id: 'driver-abc', created_by: 'user-123' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'completed' }] });
    mockAxiosPost.mockRejectedValueOnce(new Error('notification service down'));

    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'completed',
    });
    expect(res.status).toBe(200);
  });

  it('stores podPhotoUrl in DeliveryEvent when completing a mission', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'in_progress', driver_id: 'driver-abc', created_by: 'user-123' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'completed' }] });

    await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'completed',
      notes: 'Signed by receptionist',
      podPhotoUrl: 'https://cdn.example.com/pod/abc123.jpg',
    });

    await new Promise(r => setTimeout(r, 50));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mission_id: 'mission-uuid',
        status: 'completed',
        podPhotoUrl: 'https://cdn.example.com/pod/abc123.jpg',
        notes: 'Signed by receptionist',
      })
    );
  });

  it('RETURNING includes full mission fields (pickupAddress, deliveryAddress)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'in_progress', driver_id: 'driver-abc', created_by: 'user-123' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleMission, status: 'completed' }] });

    const res = await withUser(request(app).patch('/missions/mission-uuid/status')).send({
      status: 'completed',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.pickupAddress).toBe('10 Pickup St');
    expect(res.body.data.deliveryAddress).toBe('20 Delivery Ave');
    expect(res.body.data.createdBy).toBe('user-123');
  });

  it('rejects pending → completed (invalid transition)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'pending', driver_id: null, created_by: 'user-123' }] });
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

// ── PATCH /missions/:id/location ──────────────────────────────────────────────
describe('PATCH /missions/:id/location', () => {
  it('returns 200, writes DeliveryEvent, and emits driver:location', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'in_progress', created_by: 'dispatcher-xyz' }],
    });

    const res = await withUser(request(app).patch('/missions/mission-uuid/location')).send({
      lat: 48.8566,
      lng: 2.3522,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ missionId: 'mission-uuid', lat: 48.8566, lng: 2.3522 });

    await new Promise(r => setTimeout(r, 50));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mission_id: 'mission-uuid',
        status: 'in_progress',
        location: { lat: 48.8566, lng: 2.3522 },
      })
    );
    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/emit'),
      expect.objectContaining({ event: 'driver:location', userId: 'dispatcher-xyz' }),
      expect.any(Object)
    );
  });

  it('returns 409 when mission is not in_progress', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'assigned', created_by: 'dispatcher-xyz' }],
    });

    const res = await withUser(request(app).patch('/missions/mission-uuid/location')).send({
      lat: 48.8566,
      lng: 2.3522,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('returns 400 when lat or lng is missing', async () => {
    const res = await withUser(request(app).patch('/missions/mission-uuid/location')).send({
      lat: 48.8566,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 404 when mission not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).patch('/missions/nope/location')).send({
      lat: 48.8566,
      lng: 2.3522,
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
