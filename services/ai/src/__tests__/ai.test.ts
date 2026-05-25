/**
 * AI service tests
 * - axios is mocked (no real upstream HTTP calls)
 * - ml/model is mocked (no real TF.js training — would be very slow in tests)
 */

// ── Mock axios ────────────────────────────────────────────────────────────────
const mockAxiosGet = jest.fn();
jest.mock('axios', () => ({
  get: mockAxiosGet,
}));

// ── Mock TF.js model (scoreDrivers) ──────────────────────────────────────────
const mockScoreDrivers = jest.fn();
jest.mock('../ml/model', () => ({
  getModel: jest.fn().mockResolvedValue({
    countParams: () => 200,
    layers: [{}, {}, {}],
  }),
  scoreDrivers: mockScoreDrivers,
  normalizeFeatures: jest.fn().mockReturnValue([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]),
  _resetModel: jest.fn(),
}));

import request from 'supertest';
import app from '../app';

// Helper: inject x-user-* headers
function withUser(req: request.Test): request.Test {
  return req
    .set('x-user-id',    'user-001')
    .set('x-user-role',  'dispatcher')
    .set('x-user-email', 'disp@test.com');
}

const sampleMission = {
  id: 'miss-001',
  clientName: 'Acme Corp',
  pickupLat: '36.7',
  pickupLng: '3.0',
  deliveryLat: '36.8',
  deliveryLng: '3.1',
  deadline: null,
  status: 'pending',
};

const sampleDrivers = [
  {
    id: 'drv-001',
    name: 'Alice',
    lat: 36.71,
    lng: 3.01,
    currentLoad: 1,
    acceptanceRate: '95.00',
    experienceDays: 200,
    status: 'available',
  },
  {
    id: 'drv-002',
    name: 'Bob',
    lat: 36.75,
    lng: 3.05,
    currentLoad: 0,
    acceptanceRate: '88.00',
    experienceDays: 400,
    status: 'available',
  },
];

beforeEach(() => jest.clearAllMocks());

// ── Health ────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with service name', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('ai');
  });
});

// ── requireUser ───────────────────────────────────────────────────────────────
describe('requireUser middleware', () => {
  it('returns 401 without user context headers', async () => {
    const res = await request(app).post('/ai/suggest-assignment').send({ missionId: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

// ── POST /ai/suggest-assignment ───────────────────────────────────────────────
describe('POST /ai/suggest-assignment', () => {
  it('returns ranked driver suggestions', async () => {
    // Mission fetch
    mockAxiosGet.mockResolvedValueOnce({
      data: { status: 'success', data: sampleMission },
    });
    // Driver list fetch
    mockAxiosGet.mockResolvedValueOnce({
      data: { status: 'success', data: sampleDrivers },
    });
    // scoreDrivers returns ranked list
    mockScoreDrivers.mockResolvedValueOnce([
      {
        driverId: 'drv-001',
        name: 'Alice',
        score: 0.87,
        features: { distanceKm: 2.1, currentLoad: 1, acceptanceRate: 95, experienceDays: 200, missionUrgency: 0, timeOfDayScore: 1, zoneMatch: 0 },
      },
      {
        driverId: 'drv-002',
        name: 'Bob',
        score: 0.74,
        features: { distanceKm: 5.4, currentLoad: 0, acceptanceRate: 88, experienceDays: 400, missionUrgency: 0, timeOfDayScore: 1, zoneMatch: 0 },
      },
    ]);

    const res = await withUser(
      request(app).post('/ai/suggest-assignment').send({ missionId: 'miss-001' })
    );
    expect(res.status).toBe(200);
    expect(res.body.data.suggestions).toHaveLength(2);
    expect(res.body.data.suggestions[0].driverId).toBe('drv-001');
    expect(res.body.data.suggestions[0].score).toBe(0.87);
  });

  it('returns 400 when missionId is missing', async () => {
    const res = await withUser(request(app).post('/ai/suggest-assignment').send({}));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 404 when mission service returns failure', async () => {
    mockAxiosGet.mockResolvedValueOnce({
      data: { status: 'failure', error: { code: 'NOT_FOUND' } },
    });
    const res = await withUser(
      request(app).post('/ai/suggest-assignment').send({ missionId: 'nope' })
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns empty suggestions when no drivers are available', async () => {
    mockAxiosGet
      .mockResolvedValueOnce({ data: { status: 'success', data: sampleMission } })
      .mockResolvedValueOnce({ data: { status: 'success', data: [] } });

    const res = await withUser(
      request(app).post('/ai/suggest-assignment').send({ missionId: 'miss-001' })
    );
    expect(res.status).toBe(200);
    expect(res.body.data.suggestions).toHaveLength(0);
  });

  it('returns 500 when an upstream call throws', async () => {
    mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));
    const res = await withUser(
      request(app).post('/ai/suggest-assignment').send({ missionId: 'miss-001' })
    );
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});

// ── GET /ai/model-info ────────────────────────────────────────────────────────
describe('GET /ai/model-info', () => {
  it('returns model metadata', async () => {
    const res = await withUser(request(app).get('/ai/model-info'));
    expect(res.status).toBe(200);
    expect(res.body.data.paramCount).toBeDefined();
    expect(res.body.data.layerCount).toBeDefined();
  });
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-xyz');
    expect(res.status).toBe(404);
  });
});
