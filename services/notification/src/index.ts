import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4005;

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`[notification] client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[notification] client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[notification] running on port ${PORT} (HTTP + WS)`);
});

export default app;
