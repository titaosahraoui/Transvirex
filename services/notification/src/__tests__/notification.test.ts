/**
 * Notification service tests
 * - mongoose is mocked (no real Mongo)
 * - Tests cover REST endpoints (health, /emit, 404) and Socket.IO auth
 */

// ── Mock mongoose ─────────────────────────────────────────────────────────────
const mockMessageCreate = jest.fn();
jest.mock('../db/mongo', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
  Message: { create: mockMessageCreate },
  Notification: { create: jest.fn() },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, io, userSocketMap } from '../app';

const JWT_SECRET = 'changeme';

function makeToken(payload = { userId: 'u1', role: 'dispatcher', email: 'a@a.com' }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

afterEach(() => {
  jest.clearAllMocks();
  userSocketMap.clear();
  // Close Socket.IO so tests don't leak open handles
  io.disconnectSockets(true);
});

// ── Health ────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with service name and connectedUsers count', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('notification');
    expect(typeof res.body.data.connectedUsers).toBe('number');
  });
});

// ── POST /emit ────────────────────────────────────────────────────────────────
describe('POST /emit', () => {
  it('returns 400 when event or userId is missing', async () => {
    const res = await request(app).post('/emit').send({ event: 'mission:status' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });

  it('returns delivered:false when user is not connected', async () => {
    const res = await request(app)
      .post('/emit')
      .send({ event: 'mission:assigned', userId: 'offline-user', data: { test: true } });
    expect(res.status).toBe(200);
    expect(res.body.data.delivered).toBe(false);
  });

  it('returns delivered:true when user socket is in the map', async () => {
    // Simulate a connected user by pre-populating the map
    userSocketMap.set('online-user', 'fake-socket-id');

    // Spy on io.to().emit() — we just verify delivered:true is returned
    const toSpy = jest.spyOn(io, 'to').mockReturnValue({ emit: jest.fn() } as any);

    const res = await request(app)
      .post('/emit')
      .send({ event: 'mission:status', userId: 'online-user', data: { status: 'in_progress' } });
    expect(res.status).toBe(200);
    expect(res.body.data.delivered).toBe(true);
    expect(toSpy).toHaveBeenCalledWith('fake-socket-id');

    toSpy.mockRestore();
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── Socket.IO auth middleware ─────────────────────────────────────────────────
describe('validateSocketToken', () => {
  it('returns the decoded payload for a valid token', () => {
    const { validateSocketToken } = require('../socket/handlers');
    const token = makeToken({ userId: 'u42', role: 'driver', email: 'd@d.com' });
    const payload = validateSocketToken(token);
    expect(payload.userId).toBe('u42');
    expect(payload.role).toBe('driver');
  });

  it('throws for an invalid token', () => {
    const { validateSocketToken } = require('../socket/handlers');
    expect(() => validateSocketToken('not.a.token')).toThrow();
  });

  it('throws for an expired token', () => {
    const { validateSocketToken } = require('../socket/handlers');
    const expired = jwt.sign({ userId: 'x', role: 'driver', email: 'x@x.com' }, JWT_SECRET, {
      expiresIn: -1,
    });
    expect(() => validateSocketToken(expired)).toThrow();
  });
});
