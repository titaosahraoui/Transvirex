import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initSchema } from './db/postgres';
import { connectMongo } from './db/mongo';

const PORT = process.env.PORT || 4002;

async function start(): Promise<void> {
  await initSchema();
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`[mission] running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[mission] failed to start:', err);
  process.exit(1);
});
