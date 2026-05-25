/**
 * Socket.IO event handlers
 *
 * Events:
 *   Client → Server:
 *     'message:send'     — dispatcher or driver sends a chat message
 *     'driver:location'  — driver pushes a GPS ping
 *
 *   Server → Client (pushed by /emit HTTP endpoint or by event handlers):
 *     'mission:assigned'  — driver receives new mission
 *     'mission:status'    — dispatcher receives driver status update
 *     'message:received'  — recipient receives a chat message
 *     'message:delivered' — sender confirmation after message is stored
 *     'alert:delay'       — dispatcher receives a delay alert
 */

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Message } from '../db/mongo';

interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

// In-memory map: userId → socketId
// In production you'd use Redis for multi-instance support.
export const userSocketMap = new Map<string, string>();

/**
 * Validate the JWT supplied in the Socket.IO handshake auth header.
 * Returns the decoded payload or throws.
 */
export function validateSocketToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET || 'changeme') as JwtPayload;
}

/**
 * Register all Socket.IO event handlers.
 * Called once per accepted connection.
 */
export function registerHandlers(io: Server, socket: Socket, user: JwtPayload): void {
  const { userId } = user;

  // Track this socket
  userSocketMap.set(userId, socket.id);
  console.log(`[notification] user ${userId} connected (socket ${socket.id})`);

  // ── message:send ───────────────────────────────────────────────────────────
  socket.on(
    'message:send',
    async (payload: { to: string; content: string; missionId?: string }) => {
      try {
        const { to, content, missionId } = payload;
        if (!to || !content) return;

        const conversationId = [userId, to].sort().join('_');

        const saved = await Message.create({
          conversationId,
          senderId:   userId,
          receiverId: to,
          missionId,
          content,
        });

        // Deliver to recipient if online
        const recipientSocketId = userSocketMap.get(to);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message:received', {
            id:             saved._id,
            conversationId: saved.conversationId,
            senderId:       saved.senderId,
            content:        saved.content,
            missionId:      saved.missionId,
            timestamp:      saved.timestamp,
          });
        }

        // Confirm delivery to sender
        socket.emit('message:delivered', { messageId: saved._id });
      } catch (err) {
        console.error('[notification] message:send error:', err);
      }
    }
  );

  // ── driver:location ────────────────────────────────────────────────────────
  socket.on('driver:location', (payload: { missionId: string; lat: number; lng: number }) => {
    // Broadcast to all connected dispatchers (simplified: broadcast to everyone)
    socket.broadcast.emit('driver:location', { ...payload, driverId: userId });
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    userSocketMap.delete(userId);
    console.log(`[notification] user ${userId} disconnected`);
  });
}
