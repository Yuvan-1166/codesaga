import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { CONFIG } from './config';
import routes from './api/routes';

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

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: CONFIG.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
const server = app.listen(CONFIG.port, () => {
  console.log(`🚀 CodeSaga Execution Server running on port ${CONFIG.port}`);
  console.log(`📦 Environment: ${CONFIG.nodeEnv}`);
  console.log(`🐳 Docker images: ${Object.values(CONFIG.docker.images).join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
