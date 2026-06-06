import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { createSuccess } from '@transvirex/shared';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json(createSuccess({ service: 'auth', uptime: process.uptime() }));
});

// Routes
app.use('/auth', authRoutes);
app.use('/',     userRoutes);

export default app;
