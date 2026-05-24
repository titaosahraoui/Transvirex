import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mission', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[mission] running on port ${PORT}`);
});

export default app;
