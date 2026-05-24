import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initSchema } from './db/postgres';

const PORT = process.env.PORT || 4001;

async function start() {
  await initSchema();
  app.listen(PORT, () => {
    console.log(`[auth] running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[auth] failed to start:', err);
  process.exit(1);
});
