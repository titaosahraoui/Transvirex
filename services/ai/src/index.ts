import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { getModel } from './ml/model';

const PORT = process.env.PORT || 4004;

async function start(): Promise<void> {
  // Pre-train the model at startup so the first request isn't slow
  console.log('[ai] Training model on synthetic data...');
  await getModel();

  app.listen(PORT, () => {
    console.log(`[ai] running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[ai] failed to start:', err);
  process.exit(1);
});
