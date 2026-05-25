import dotenv from 'dotenv';
dotenv.config();

import { httpServer } from './app';
import { connectMongo } from './db/mongo';

const PORT = process.env.PORT || 4005;

async function start(): Promise<void> {
  await connectMongo();
  httpServer.listen(PORT, () => {
    console.log(`[notification] running on port ${PORT} (HTTP + WebSocket)`);
  });
}

start().catch((err) => {
  console.error('[notification] failed to start:', err);
  process.exit(1);
});
