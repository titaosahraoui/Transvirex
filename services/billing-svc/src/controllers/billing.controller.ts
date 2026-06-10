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
      SELECT id, reference, mission_id AS "missionId", client_name AS "clientName",
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
      `SELECT id, reference, mission_id AS "missionId", client_name AS "clientName",
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
      `SELECT id, reference, mission_id AS "missionId", client_name AS "clientName",
              amount, status, generated_at AS "generatedAt", paid_at AS "paidAt"
       FROM invoices WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json(createError('NOT_FOUND', 'Invoice not found'));
      return;
    }

    const inv = result.rows[0];
    const ref = inv.reference ?? inv.id.slice(0, 8).toUpperCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${ref}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('TRANSVIREX', { align: 'right' });
    doc.fontSize(11).font('Helvetica').fillColor('#888888').text('Logistique & Transport', { align: 'right' });
    doc.fillColor('#000000').moveDown(0.5);

    // Reference badge (large, prominent)
    doc.fontSize(18).font('Helvetica-Bold').text(ref, { align: 'left' });
    doc.fontSize(10).font('Helvetica').fillColor('#888888').text('Référence facture', { align: 'left' });
    doc.fillColor('#000000').moveDown(1.5);

    // Separator
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#cccccc');
    doc.moveDown(0.8);

    // Body
    doc.fontSize(11).font('Helvetica-Bold').text('Client :', { continued: true }).font('Helvetica').text(` ${inv.clientName}`);
    doc.font('Helvetica-Bold').text('Mission :', { continued: true }).font('Helvetica').text(` ${inv.missionId}`);
    doc.font('Helvetica-Bold').text('Date d\'émission :', { continued: true }).font('Helvetica').text(` ${new Date(inv.generatedAt).toLocaleDateString('fr-FR')}`);
    doc.font('Helvetica-Bold').text('Statut :', { continued: true }).font('Helvetica').text(` ${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}`);
    if (inv.paidAt) {
      doc.font('Helvetica-Bold').text('Payé le :', { continued: true }).font('Helvetica').text(` ${new Date(inv.paidAt).toLocaleDateString('fr-FR')}`);
    }
    doc.moveDown(1.5);

    // Amount
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#cccccc');
    doc.moveDown(0.8);
    doc.fontSize(14).font('Helvetica-Bold').text(`Montant total : ${Number(inv.amount).toLocaleString('fr-FR')} DZD`, { align: 'right' });
    doc.moveDown(3);

    // Footer — sequence reference
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(0.5).stroke('#dddddd');
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor('#aaaaaa')
      .text(`Référence séquentielle : ${ref}  ·  ID système : ${inv.id}`, { align: 'center' })
      .text('Transvirex — Document généré automatiquement', { align: 'center' });

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
      `INSERT INTO invoices (mission_id, client_name, amount, created_by, reference)
       VALUES ($1, $2, $3, $4,
         'FAC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_seq')::text, 4, '0')
       )
       RETURNING id, reference, mission_id AS "missionId", client_name AS "clientName",
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
       RETURNING id, reference, mission_id AS "missionId", client_name AS "clientName",
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

// ── GET /billing/sla ─────────────────────────────────────────────────────────
export async function getSlaStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const [mainRes, overdueRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'paid') AS "paidCount",
          COUNT(*) FILTER (
            WHERE status = 'paid'
            AND EXTRACT(EPOCH FROM (paid_at - generated_at)) / 86400 <= 30
          ) AS "paidOnTimeCount",

          COUNT(*) FILTER (WHERE status = 'sent') AS "overdueCount",
          COALESCE(SUM(amount) FILTER (WHERE status = 'sent'), 0) AS "overdueAmount",

          COUNT(*) FILTER (
            WHERE status = 'sent'
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 <= 30
          ) AS "a0_30Count",
          COALESCE(SUM(amount) FILTER (
            WHERE status = 'sent'
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 <= 30
          ), 0) AS "a0_30Amount",

          COUNT(*) FILTER (
            WHERE status = 'sent'
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 > 30
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 <= 60
          ) AS "a31_60Count",
          COALESCE(SUM(amount) FILTER (
            WHERE status = 'sent'
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 > 30
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 <= 60
          ), 0) AS "a31_60Amount",

          COUNT(*) FILTER (
            WHERE status = 'sent'
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 > 60
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 <= 90
          ) AS "a61_90Count",
          COALESCE(SUM(amount) FILTER (
            WHERE status = 'sent'
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 > 60
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 <= 90
          ), 0) AS "a61_90Amount",

          COUNT(*) FILTER (
            WHERE status = 'sent'
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 > 90
          ) AS "a90pCount",
          COALESCE(SUM(amount) FILTER (
            WHERE status = 'sent'
            AND EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400 > 90
          ), 0) AS "a90pAmount",

          COALESCE(AVG(
            EXTRACT(EPOCH FROM (paid_at - generated_at)) / 86400
          ) FILTER (WHERE status = 'paid'), 0) AS "avgDaysToPay"
        FROM invoices
      `),
      pool.query(`
        SELECT id, reference, client_name AS "clientName", amount,
               generated_at AS "generatedAt",
               ROUND(EXTRACT(EPOCH FROM (NOW() - generated_at)) / 86400)::int AS "daysOld"
        FROM invoices
        WHERE status = 'sent'
        ORDER BY generated_at ASC
      `),
    ]);

    const r = mainRes.rows[0];
    const paidCount = parseInt(r.paidCount, 10);
    const paidOnTime = parseInt(r.paidOnTimeCount, 10);

    res.json(createSuccess({
      slaRate:        paidCount === 0 ? 100 : Math.round((paidOnTime / paidCount) * 100),
      paidCount,
      paidOnTimeCount: paidOnTime,
      overdueCount:   parseInt(r.overdueCount, 10),
      overdueAmount:  r.overdueAmount,
      avgDaysToPay:   parseFloat(parseFloat(r.avgDaysToPay).toFixed(1)),
      aging: {
        '0_30':  { count: parseInt(r.a0_30Count,  10), amount: r.a0_30Amount  },
        '31_60': { count: parseInt(r.a31_60Count, 10), amount: r.a31_60Amount },
        '61_90': { count: parseInt(r.a61_90Count, 10), amount: r.a61_90Amount },
        '90plus':{ count: parseInt(r.a90pCount,   10), amount: r.a90pAmount   },
      },
      overdueInvoices: overdueRes.rows,
    }));
  } catch (err) {
    console.error('[billing] getSlaStats error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch SLA stats'));
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
