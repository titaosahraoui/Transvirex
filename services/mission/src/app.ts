import express from 'express';
import cors from 'cors';
import { createSuccess } from '@transvirex/shared';
import missionRoutes from './routes/mission.routes';

const app = express();

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json(
    createSuccess({
      service: 'mission',
      uptime: process.uptime(),
    })
  );
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/missions', missionRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
import { createError } from '@transvirex/shared';
app.use((_req, res) => {
  res.status(404).json(createError('NOT_FOUND', 'Route not found'));
});

export default app;
