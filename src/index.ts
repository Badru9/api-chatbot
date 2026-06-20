import cors from 'cors';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './services/auth.js';

import chatRoutes from './routes/chat.js';
import documentRoutes from './routes/documents.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Mount Better Auth handler BEFORE express.json()
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[api-chatbot] Server running on http://localhost:${PORT}`);
});
