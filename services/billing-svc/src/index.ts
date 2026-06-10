import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initSchema } from './db/postgres';
import { startOverdueChecker } from './jobs/overdueChecker';

const PORT = process.env.PORT || 4003;

async function start(): Promise<void> {
  await initSchema();
  startOverdueChecker();
  app.listen(PORT, () => {
    console.log(`[billing-svc] running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[billing-svc] failed to start:', err);
  process.exit(1);
});
