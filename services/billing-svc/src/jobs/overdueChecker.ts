import axios from 'axios';
import { pool } from '../db/postgres';

const OVERDUE_DAYS = Number(process.env.OVERDUE_DAYS ?? 7);
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

function notifyUser(event: string, userId: string, data: unknown): void {
  const url = `${process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:4005'}/emit`;
  axios.post(url, { event, userId, data }).catch(() => {});
}

async function checkOverdueInvoices(): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT id, client_name AS "clientName", amount,
              generated_at AS "generatedAt", created_by AS "createdBy"
       FROM invoices
       WHERE status = 'sent'
         AND generated_at < NOW() - ($1 || ' days')::INTERVAL
         AND created_by IS NOT NULL`,
      [OVERDUE_DAYS]
    );

    for (const inv of result.rows) {
      notifyUser('invoice:overdue', inv.createdBy, {
        invoiceId: inv.id,
        clientName: inv.clientName,
        amount: inv.amount,
        generatedAt: inv.generatedAt,
        overdueDays: OVERDUE_DAYS,
      });
    }

    if (result.rows.length > 0) {
      console.log(`[billing] overdue check: notified ${result.rows.length} overdue invoice(s)`);
    }
  } catch (err) {
    console.error('[billing] overdue check failed:', err);
  }
}

export function startOverdueChecker(): void {
  checkOverdueInvoices();
  setInterval(checkOverdueInvoices, CHECK_INTERVAL_MS);
}
