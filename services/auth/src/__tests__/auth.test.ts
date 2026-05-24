import request from 'supertest';
import app from '../app';

// ─── Mock pg Pool ──────────────────────────────────────────────────────────────
jest.mock('../db/postgres', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// ─── Mock bcryptjs ─────────────────────────────────────────────────────────────
jest.mock('bcryptjs', () => ({
  hash:    jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { pool } from '../db/postgres';
const mockQuery = pool.query as jest.Mock;

// ─── Reset mocks between tests ─────────────────────────────────────────────────
beforeEach(() => {
  mockQuery.mockReset();
});

// ─── Health ────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with status:success', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.service).toBe('auth');
  });
});

// ─── Register ──────────────────────────────────────────────────────────────────
describe('POST /auth/register', () => {
  const validBody = {
    email: 'driver@test.com',
    password: 'secret123',
    name: 'Test Driver',
    phone: '0612345678',
    role: 'driver',
  };

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('failure');
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 409 when email already exists', async () => {
    // First query: email exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] });

    const res = await request(app).post('/auth/register').send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_EXISTS');
  });

  it('returns 201 and a JWT token on success', async () => {
    // First query: email not found → no existing user
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Second query: INSERT users → return new user
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'new-uuid',
        email: validBody.email,
        role: 'driver',
        name: validBody.name,
        phone: validBody.phone,
        created_at: new Date().toISOString(),
      }],
    });
    // Third query: INSERT drivers (because role = 'driver')
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/auth/register').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(validBody.email);
  });

  it('returns 400 when role is invalid', async () => {
    // Email check returns empty (not existing)
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...validBody, role: 'hacker' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ROLE');
  });
});

// ─── Login ─────────────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  const validBody = { email: 'driver@test.com', password: 'secret123' };

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 401 when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/auth/login').send(validBody);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 when password is wrong', async () => {
    const bcrypt = require('bcryptjs');
    bcrypt.compare.mockResolvedValueOnce(false);

    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'uuid-1',
        email: validBody.email,
        password_hash: 'hashed',
        role: 'driver',
        name: 'Test',
        phone: null,
        created_at: new Date().toISOString(),
      }],
    });

    const res = await request(app).post('/auth/login').send(validBody);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 200 with token on success', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'uuid-1',
        email: validBody.email,
        password_hash: 'hashed',
        role: 'driver',
        name: 'Test Driver',
        phone: '0600000000',
        created_at: new Date().toISOString(),
      }],
    });

    const res = await request(app).post('/auth/login').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('driver');
  });
});
