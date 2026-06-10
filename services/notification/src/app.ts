import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createSuccess, createError } from '@transvirex/shared';
import { validateSocketToken, registerHandlers, userSocketMap } from './socket/handlers';
import { Message } from './db/mongo';
export { userSocketMap }; // re-export for tests

function httpAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json(createError('UNAUTHORIZED', 'Token required'));
  try { req.user = validateSocketToken(token); next(); }
  catch { res.status(401).json(createError('INVALID_TOKEN', 'Invalid token')); }
}

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

// GET /messages?with=:otherUserId&limit=50
app.get('/messages', httpAuth, async (req: any, res: any) => {
  try {
    const { with: otherId, limit = '50' } = req.query;
    if (!otherId) return res.status(400).json(createError('MISSING_FIELD', 'with query param required'));
    const conversationId = [req.user.userId, String(otherId)].sort().join('_');
    const msgs = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string));
    res.json(createSuccess(msgs.reverse()));
  } catch (err) {
    console.error('[notification] GET /messages error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch messages'));
  }
});

// GET /conversations
app.get('/conversations', httpAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const convos = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort: { timestamp: -1 } },
      { $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unread: { $sum: { $cond: [{ $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$read', false] }] }, 1, 0] } },
      }},
    ]);
    res.json(createSuccess(convos));
  } catch (err) {
    console.error('[notification] GET /conversations error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to fetch conversations'));
  }
});

// PATCH /messages/read?with=:otherUserId
app.patch('/messages/read', httpAuth, async (req: any, res: any) => {
  try {
    const { with: otherId } = req.query;
    if (!otherId) return res.status(400).json(createError('MISSING_FIELD', 'with query param required'));
    const conversationId = [req.user.userId, String(otherId)].sort().join('_');
    await Message.updateMany(
      { conversationId, receiverId: req.user.userId, read: false },
      { read: true }
    );
    res.json(createSuccess({ ok: true }));
  } catch (err) {
    console.error('[notification] PATCH /messages/read error:', err);
    res.status(500).json(createError('INTERNAL_ERROR', 'Failed to mark messages read'));
  }
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json(createError('NOT_FOUND', 'Route not found'));
});

export default app;
