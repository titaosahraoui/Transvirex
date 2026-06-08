import { Response } from 'express';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import { pool } from '../db/postgres';
import { createSuccess, createError } from '@transvirex/shared';
import { AuthenticatedRequest } from '../middleware/requireUser';

function notifyUser(event: string, userId: string, data: unknown): void {
  const url = `${process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4005'}/emit`;
  axios.post(url, { event, userId, data }).catch(() => {});
}

// ── GET /billing/invoices?status=X ───────────────────────────────────────────
export async function getInvoices(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { status } = req.query as { status?: string };

    let query = `
      SELECT id, mission_id AS "missionId", client_name AS "clientName",
             amount, status, generated_at AS "generatedAt", paid_at AS "paidAt"
      FROM invoices
    `;
    const values: unknown[] = [];

    if (status) {
      query += ` WHERE status = $1`;
      values.push(status);
    }

    query += ` ORDER BY generated_at DESC`;

    const result = await pool.query(query, values);
    res.json(createSuccess(result.rows));
  } catch (err) {
    console.error('[billing] getInvoices error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch invoices'));
  }
}

// ── GET /billing/invoices/:id ─────────────────────────────────────────────────
export async function getInvoiceById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, mission_id AS "missionId", client_name AS "clientName",
              amount, status, generated_at AS "generatedAt", paid_at AS "paidAt"
       FROM invoices WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Invoice not found'));
      return;
    }

    res.json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[billing] getInvoiceById error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch invoice'));
  }
}

// ── GET /billing/invoices/:id/pdf ─────────────────────────────────────────────
export async function downloadInvoicePdf(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, mission_id AS "missionId", client_name AS "clientName",
              amount, status, generated_at AS "generatedAt", paid_at AS "paidAt"
       FROM invoices WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Invoice not found'));
      return;
    }

    const inv = result.rows[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('TRANSVIREX', { align: 'right' });
    doc.fontSize(14).font('Helvetica').text('Facture / Invoice', { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(11).font('Helvetica-Bold').text(`Numéro: ${inv.id}`);
    doc.font('Helvetica').text(`Client: ${inv.clientName}`);
    doc.text(`Mission: ${inv.missionId}`);
    doc.text(`Date: ${new Date(inv.generatedAt).toLocaleDateString('fr-FR')}`);
    doc.text(`Statut: ${inv.status}`);
    if (inv.paidAt) doc.text(`Payé le: ${new Date(inv.paidAt).toLocaleDateString('fr-FR')}`);
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text(`Montant total: ${Number(inv.amount).toFixed(2)} €`, { align: 'right' });

    doc.end();
  } catch (err) {
    console.error('[billing] downloadInvoicePdf error:', err);
    if (!res.headersSent) res.status(500).json(createError('INTERNAL_ERROR', 'Failed to generate PDF'));
  }
}

// ── POST /billing/invoices ────────────────────────────────────────────────────
export async function createInvoice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { missionId, clientName, amount } = req.body;

    if (!missionId || !clientName || amount === undefined || amount === null) {
      res.status(400).json(
        createError('MISSING_FIELDS', 'missionId, clientName, and amount are required')
      );
      return;
    }

    if (typeof amount !== 'number' || amount < 0) {
      res.status(400).json(createError('INVALID_AMOUNT', 'amount must be a non-negative number'));
      return;
    }

    const result = await pool.query(
      `INSERT INTO invoices (mission_id, client_name, amount, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, mission_id AS "missionId", client_name AS "clientName",
                 amount, status, generated_at AS "generatedAt", paid_at AS "paidAt"`,
      [missionId, clientName, amount, req.user!.userId]
    );

    res.status(201).json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[billing] createInvoice error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to create invoice'));
  }
}

// ── PATCH /billing/invoices/:id/status ───────────────────────────────────────
// Allowed transitions: draft → sent → paid
export async function updateInvoiceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['sent', 'paid'];
    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json(
        createError('INVALID_STATUS', `status must be one of: ${VALID_STATUSES.join(', ')}`)
      );
      return;
    }

    const current = await pool.query(
      `SELECT status, created_by AS "createdBy" FROM invoices WHERE id = $1`, [id]
    );

    if (current.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Invoice not found'));
      return;
    }

    const currentStatus: string = current.rows[0].status;
    const createdBy: string | null = current.rows[0].createdBy;

    const allowed: Record<string, string[]> = {
      draft: ['sent'],
      sent:  ['paid'],
    };

    if (!allowed[currentStatus]?.includes(status)) {
      res.status(409).json(
        createError(
          'INVALID_TRANSITION',
          `Cannot transition invoice from '${currentStatus}' to '${status}'`
        )
      );
      return;
    }

    const paidAt = status === 'paid' ? new Date() : null;

    const result = await pool.query(
      `UPDATE invoices
       SET status = $1, paid_at = COALESCE($2, paid_at)
       WHERE id = $3
       RETURNING id, mission_id AS "missionId", client_name AS "clientName",
                 amount, status, generated_at AS "generatedAt", paid_at AS "paidAt"`,
      [status, paidAt, id]
    );

    res.json(createSuccess(result.rows[0]));

    if (status === 'paid' && createdBy) {
      notifyUser('invoice:paid', createdBy, {
        invoiceId: id,
        amount: result.rows[0].amount,
      });
    }
  } catch (err) {
    console.error('[billing] updateInvoiceStatus error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to update invoice status'));
  }
}

// ── GET /billing/payments?invoiceId=X ────────────────────────────────────────
export async function getPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { invoiceId } = req.query as { invoiceId?: string };

    let query = `
      SELECT id, invoice_id AS "invoiceId", amount,
             payment_date AS "paymentDate", method
      FROM payments
    `;
    const values: unknown[] = [];

    if (invoiceId) {
      query += ` WHERE invoice_id = $1`;
      values.push(invoiceId);
    }

    query += ` ORDER BY payment_date DESC`;

    const result = await pool.query(query, values);
    res.json(createSuccess(result.rows));
  } catch (err) {
    console.error('[billing] getPayments error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch payments'));
  }
}

// ── POST /billing/payments ────────────────────────────────────────────────────
export async function recordPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { invoiceId, amount, method = 'bank_transfer' } = req.body;

    if (!invoiceId || amount === undefined || amount === null) {
      res.status(400).json(
        createError('MISSING_FIELDS', 'invoiceId and amount are required')
      );
      return;
    }

    if (typeof amount !== 'number' || amount < 0) {
      res.status(400).json(createError('INVALID_AMOUNT', 'amount must be a non-negative number'));
      return;
    }

    const invoiceCheck = await pool.query(
      `SELECT id, created_by AS "createdBy" FROM invoices WHERE id = $1`, [invoiceId]
    );
    if (invoiceCheck.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Invoice not found'));
      return;
    }

    const createdBy: string | null = invoiceCheck.rows[0].createdBy;

    const result = await pool.query(
      `INSERT INTO payments (invoice_id, amount, method)
       VALUES ($1, $2, $3)
       RETURNING id, invoice_id AS "invoiceId", amount,
                 payment_date AS "paymentDate", method`,
      [invoiceId, amount, method]
    );

    res.status(201).json(createSuccess(result.rows[0]));

    if (createdBy) {
      notifyUser('payment:recorded', createdBy, {
        invoiceId,
        paymentId: result.rows[0].id,
        amount: result.rows[0].amount,
      });
    }
  } catch (err) {
    console.error('[billing] recordPayment error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to record payment'));
  }
}

// ── GET /billing/stats ────────────────────────────────────────────────────────
export async function getBillingStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft') AS "draftCount",
        COUNT(*) FILTER (WHERE status = 'sent')  AS "sentCount",
        COUNT(*) FILTER (WHERE status = 'paid')  AS "paidCount",
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS "totalRevenue",
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (paid_at - generated_at)) / 86400
        ) FILTER (WHERE status = 'paid'), 0) AS "avgDaysToPayment"
      FROM invoices
    `);

    res.json(createSuccess(result.rows[0]));
  } catch (err) {
    console.error('[billing] getBillingStats error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch billing stats'));
  }
}
