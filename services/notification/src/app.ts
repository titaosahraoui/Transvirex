import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createSuccess, createError } from '@transvirex/shared';
import { validateSocketToken, registerHandlers, userSocketMap } from './socket/handlers';
export { userSocketMap }; // re-export for tests

// ── Express app ───────────────────────────────────────────────────────────────
export const app = express();
app.use(cors());
app.use(express.json());

// ── HTTP server + Socket.IO ───────────────────────────────────────────────────
export const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Socket.IO JWT authentication middleware ───────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  try {
    const user = validateSocketToken(token);
    (socket as any).user = user;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});

// ── Socket.IO connection ──────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const user = (socket as any).user;
  registerHandlers(io, socket, user);
});

// ── REST endpoints ────────────────────────────────────────────────────────────

// Health
app.get('/health', (_req, res) => {
  res.json(
    createSuccess({
      service:         'notification',
      uptime:          process.uptime(),
      connectedUsers:  userSocketMap.size,
    })
  );
});

/**
 * POST /emit
 * Called by other microservices (mission-svc, billing-svc, etc.) to push events.
 *
 * Body: { event: string; userId: string; data: object }
 *
 * Finds the user's socket and emits the event.
 * If the user is offline, the event is silently dropped
 * (no durable delivery — out of scope for this MVP).
 */
app.post('/emit', (req, res) => {
  const { event, userId, data } = req.body;

  if (!event || !userId) {
    res.status(400).json(createError('MISSING_FIELDS', 'event and userId are required'));
    return;
  }

  const socketId = userSocketMap.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }

  // Always 200 — caller shouldn't care if the user is offline
  res.json(createSuccess({ delivered: !!socketId }));
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json(createError('NOT_FOUND', 'Route not found'));
});

export default app;
