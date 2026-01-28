import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import positionsRoutes from './routes/positions.routes.js';
import candidatesRoutes from './routes/candidates.routes.js';
import compareRoutes from './routes/compare.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import llmRoutes from './routes/llm.routes.js';
import chatRoutes from './routes/chat.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/chat', chatRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function start(): Promise<void> {
  try {
    await connectDatabase();
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app };
