/**
 * Gateway tests
 *
 * Strategy: mock http-proxy-middleware so no real upstream calls are made.
 * The mock middleware simply calls next() — enough to prove the gateway
 * lets the request through (auth passed) or returns 401/404 on its own.
 */

// ── Mock http-proxy-middleware before app is imported ────────────────────────
jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: (_opts: unknown) =>
    // Simulate a successful proxy: respond 200 with a JSON body
    (_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void }; json: (b: unknown) => void }) => {
      res.json({ proxied: true });
    },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';

const JWT_SECRET = 'changeme';

function makeToken(payload: object = { userId: 'u1', role: 'dispatcher', email: 'a@a.com' }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

// ── Health ───────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with service info (no JWT needed)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.service).toBe('gateway');
    expect(res.body.data.routes).toBeDefined();
  });
});

// ── Public auth routes (bypass JWT) ─────────────────────────────────────────
describe('POST /auth/login — public route', () => {
  it('passes through without a JWT token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'x@x.com', password: 'secret' });
    // The mock proxy returns 200 { proxied: true } — no 401
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe(true);
  });
});

describe('POST /auth/register — public route', () => {
  it('passes through without a JWT token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'x@x.com', password: 'secret', name: 'X', role: 'driver' });
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe(true);
  });
});

// ── Protected routes — missing/invalid JWT ───────────────────────────────────
describe('Protected routes — no token', () => {
  const protectedEndpoints = [
    { method: 'get',  path: '/auth/me' },
    { method: 'get',  path: '/drivers' },
    { method: 'get',  path: '/users/some-id' },
    { method: 'get',  path: '/missions' },
    { method: 'get',  path: '/billing' },
    { method: 'post', path: '/ai/suggest-assignment' },
  ];

  it.each(protectedEndpoints)(
    '$method $path → 401 UNAUTHORIZED without token',
    async ({ method, path }) => {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('failure');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
  );
});

describe('Protected routes — invalid token', () => {
  it('returns 401 INVALID_TOKEN with a bad JWT', async () => {
    const res = await request(app)
      .get('/missions')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 INVALID_TOKEN with an expired JWT', async () => {
    const expired = jwt.sign(
      { userId: 'u1', role: 'driver', email: 'a@a.com' },
      JWT_SECRET,
      { expiresIn: -1 } // already expired
    );
    const res = await request(app)
      .get('/missions')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

// ── Protected routes — valid JWT → proxied ───────────────────────────────────
describe('Protected routes — valid JWT passes through', () => {
  it('GET /auth/me → proxied with valid token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe(true);
  });

  it('GET /drivers → proxied with valid token', async () => {
    const res = await request(app)
      .get('/drivers')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe(true);
  });

  it('GET /missions → proxied with valid token', async () => {
    const res = await request(app)
      .get('/missions')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe(true);
  });

  it('GET /billing → proxied with valid token', async () => {
    const res = await request(app)
      .get('/billing')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe(true);
  });

  it('POST /ai/suggest-assignment → proxied with valid token', async () => {
    const res = await request(app)
      .post('/ai/suggest-assignment')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ missionId: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body.proxied).toBe(true);
  });
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('GET /unknown → 404 NOT_FOUND', async () => {
    const res = await request(app).get('/unknown-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
