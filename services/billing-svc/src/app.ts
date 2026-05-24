import express from 'express';
import cors from 'cors';
import { createSuccess, createError } from '@transvirex/shared';
import billingRoutes from './routes/billing.routes';

const app = express();

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json(createSuccess({ service: 'billing-svc', uptime: process.uptime() }));
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/billing', billingRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(createError('NOT_FOUND', 'Route not found'));
});

export default app;
