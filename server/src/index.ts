import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { CONFIG } from './config';
import routes from './api/routes';
import { ensureDockerEnvironment, cleanupOldExecutions } from './utils/docker-setup';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: CONFIG.security.maxExecutionsPerMinute,
  message: 'Too many execution requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CodeSaga Execution Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      execute: 'POST /api/execute',
      jobStatus: 'GET /api/jobs/:jobId',
    },
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: CONFIG.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// Initialize Docker environment
async function initializeServer() {
  try {
    await ensureDockerEnvironment();
    await cleanupOldExecutions();
    
    // Cleanup old executions every hour
    setInterval(cleanupOldExecutions, 3600000);
    
    console.log('✅ Docker environment initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Docker environment:', error);
    process.exit(1);
  }
}

// Start server
initializeServer().then(() => {
  const server = app.listen(CONFIG.port, () => {
    console.log(`🚀 CodeSaga Execution Server running on port ${CONFIG.port}`);
    console.log(`📦 Environment: ${CONFIG.nodeEnv}`);
    console.log(`🐳 Docker images: ${Object.values(CONFIG.docker.images).join(', ')}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});

export default app;
