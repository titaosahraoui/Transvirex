import express from 'express';
import cors from 'cors';
import { createSuccess, createError } from '@transvirex/shared';
import aiRoutes from './routes/ai.routes';

const app = express();

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json(createSuccess({ service: 'ai', uptime: process.uptime() }));
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/ai', aiRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json(createError('NOT_FOUND', 'Route not found'));
});

export default app;
