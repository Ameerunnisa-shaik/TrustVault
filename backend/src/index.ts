import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import documentRoutes from './routes/document.routes';
import shareRoutes from './routes/share.routes';
import auditRoutes from './routes/audit.routes';

const app = express();

// 1. Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible inline previews if required
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS configuration with credentials support
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id'],
  })
);

// 3. Request Logging & Parsing
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(config.cookieSecret));

// 4. Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 mins for login/register
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes.' },
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 5. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TrustVault Core API',
  });
});

// 6. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/documents', shareRoutes); // share and revoke are mounted on /api/documents/:id/...
app.use('/api/audit-logs', auditRoutes);

// 7. 404 Route Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// 8. Centralized Error Handler
app.use(errorHandler);

// Start server if not running in test suite
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(
      `[TrustVault] Server running securely on port ${config.port} (${config.nodeEnv})`
    );
  });
}

export default app;
