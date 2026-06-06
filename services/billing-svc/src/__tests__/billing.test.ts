/**
 * Billing service tests
 * - pg pool fully mocked (no real DB)
 */

const mockQuery = jest.fn();
jest.mock('../db/postgres', () => ({
  pool: { query: mockQuery },
  initSchema: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../app';

// Helper: inject x-user-* headers (simulates gateway)
function withUser(req: request.Test, role = 'billing'): request.Test {
  return req
    .set('x-user-id',    'user-001')
    .set('x-user-role',  role)
    .set('x-user-email', 'billing@test.com');
}

const sampleInvoice = {
  id: 'inv-001',
  missionId: 'miss-001',
  clientName: 'Acme Corp',
  amount: '500.00',
  status: 'draft',
  generatedAt: new Date().toISOString(),
  paidAt: null,
};

beforeEach(() => jest.clearAllMocks());

// ── Health ────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with service name', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('billing-svc');
  });
});

// ── requireUser ───────────────────────────────────────────────────────────────
describe('requireUser middleware', () => {
  it('returns 401 without user context headers', async () => {
    const res = await request(app).get('/billing/invoices');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

// ── GET /billing/invoices ─────────────────────────────────────────────────────
describe('GET /billing/invoices', () => {
  it('returns list of invoices', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleInvoice] });
    const res = await withUser(request(app).get('/billing/invoices'));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].clientName).toBe('Acme Corp');
  });

  it('filters by status when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).get('/billing/invoices?status=paid'));
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status'),
      expect.arrayContaining(['paid'])
    );
  });
});

// ── GET /billing/invoices/:id ─────────────────────────────────────────────────
describe('GET /billing/invoices/:id', () => {
  it('returns a single invoice', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleInvoice] });
    const res = await withUser(request(app).get('/billing/invoices/inv-001'));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('inv-001');
  });

  it('returns 404 when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).get('/billing/invoices/nope'));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── POST /billing/invoices ────────────────────────────────────────────────────
describe('POST /billing/invoices', () => {
  const validBody = { missionId: 'miss-001', clientName: 'Acme Corp', amount: 500 };

  it('creates an invoice and returns 201', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleInvoice] });
    const res = await withUser(request(app).post('/billing/invoices')).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.data.clientName).toBe('Acme Corp');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await withUser(request(app).post('/billing/invoices')).send({
      clientName: 'Acme Corp',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 400 for negative amount', async () => {
    const res = await withUser(request(app).post('/billing/invoices')).send({
      missionId: 'miss-001',
      clientName: 'Acme Corp',
      amount: -10,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_AMOUNT');
  });
});

// ── PATCH /billing/invoices/:id/status ───────────────────────────────────────
describe('PATCH /billing/invoices/:id/status', () => {
  it('transitions draft → sent', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleInvoice, status: 'sent' }] });

    const res = await withUser(request(app).patch('/billing/invoices/inv-001/status')).send({
      status: 'sent',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
  });

  it('transitions sent → paid', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'sent' }] })
      .mockResolvedValueOnce({ rows: [{ ...sampleInvoice, status: 'paid', paidAt: new Date().toISOString() }] });

    const res = await withUser(request(app).patch('/billing/invoices/inv-001/status')).send({
      status: 'paid',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('paid');
  });

  it('returns 409 for invalid transition (draft → paid)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'draft' }] });
    const res = await withUser(request(app).patch('/billing/invoices/inv-001/status')).send({
      status: 'paid',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 400 for unknown status', async () => {
    const res = await withUser(request(app).patch('/billing/invoices/inv-001/status')).send({
      status: 'cancelled',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('returns 404 when invoice not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).patch('/billing/invoices/nope/status')).send({
      status: 'sent',
    });
    expect(res.status).toBe(404);
  });
});

// ── GET /billing/payments ─────────────────────────────────────────────────────
describe('GET /billing/payments', () => {
  it('returns all payments', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'pay-001', invoiceId: 'inv-001', amount: '500.00', paymentDate: new Date().toISOString(), method: 'bank_transfer' }],
    });
    const res = await withUser(request(app).get('/billing/payments'));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ── POST /billing/payments ────────────────────────────────────────────────────
describe('POST /billing/payments', () => {
  it('records a payment and returns 201', async () => {
    // First query: verify invoice exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'inv-001' }] });
    // Second query: insert payment
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'pay-001', invoiceId: 'inv-001', amount: '500.00', paymentDate: new Date().toISOString(), method: 'bank_transfer' }],
    });

    const res = await withUser(request(app).post('/billing/payments')).send({
      invoiceId: 'inv-001',
      amount: 500,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.invoiceId).toBe('inv-001');
  });

  it('returns 400 when required fields missing', async () => {
    const res = await withUser(request(app).post('/billing/payments')).send({ invoiceId: 'inv-001' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_FIELDS');
  });

  it('returns 404 when invoice does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await withUser(request(app).post('/billing/payments')).send({
      invoiceId: 'nonexistent',
      amount: 100,
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ── GET /billing/stats ────────────────────────────────────────────────────────
describe('GET /billing/stats', () => {
  it('returns billing statistics', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ draftCount: '2', sentCount: '1', paidCount: '5', totalRevenue: '2500.00', avgDaysToPayment: '4.5' }],
    });
    const res = await withUser(request(app).get('/billing/stats'));
    expect(res.status).toBe(200);
    expect(res.body.data.totalRevenue).toBeDefined();
  });
});
