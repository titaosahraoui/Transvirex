import { Router } from 'express';
import { requireUser } from '../middleware/requireUser';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  getPayments,
  recordPayment,
  getBillingStats,
} from '../controllers/billing.controller';

const router = Router();

// All billing routes require a valid user context
router.use(requireUser as any);

// Invoices
router.get('/invoices',              getInvoices as any);
router.get('/invoices/:id',          getInvoiceById as any);
router.post('/invoices',             createInvoice as any);
router.patch('/invoices/:id/status', updateInvoiceStatus as any);

// Payments
router.get('/payments',  getPayments as any);
router.post('/payments', recordPayment as any);

// Stats (management dashboard)
router.get('/stats', getBillingStats as any);

export default router;
