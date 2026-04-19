import express from 'express';
import cors from 'cors';
import path from 'path';
import { logRoutes } from './routes/logRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', logRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 IntelliSOC server running on http://localhost:${PORT}`);
});

export default app;
