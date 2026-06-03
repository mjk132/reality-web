import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { corsOptions } from './config/cors';
import authRoutes from './modules/auth/auth.routes';
import rbacRoutes from './modules/rbac/rbac.routes';
import whitelistRoutes from './modules/whitelist/whitelist.routes';
import managementRoutes from './modules/management/management.routes';
import citizenRoutes from './modules/citizen/citizen.routes';
import garageRoutes from './modules/garage/garage.routes';
import economyRoutes from './modules/economy/economy.routes';
import mdtRoutes from './modules/mdt/mdt.routes';
import appealRoutes from './modules/appeal/appeal.routes';

const app = express();

// ─── Security Middleware ───────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https://cdn.discordapp.com', 'data:'],
      connectSrc: ["'self'", config.clientOrigin],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Global Rate Limiting ────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests — please try again later',
  },
});

app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many authentication attempts — please try again later',
  },
});

// ─── Health Check ─────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// ─── Routes ──────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/garage', garageRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/mdt', mdtRoutes);
app.use('/api/appeal', appealRoutes);

// ─── 404 Handler ─────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested resource does not exist',
  });
});

// ─── Global Error Handler ────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);

  // Handle specific error types
  if (err.message.includes('Token expired')) {
    res.status(401).json({ error: 'TOKEN_EXPIRED', message: err.message });
    return;
  }

  if (err.message.includes('Origin')) {
    res.status(403).json({ error: 'CORS_ERROR', message: err.message });
    return;
  }

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: config.nodeEnv === 'production'
      ? 'An internal error occurred'
      : err.message,
  });
});

// ─── Start Server ────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   REALITY WEB ECOSYSTEM — API SERVER            ║
║   Port: ${config.port.toString().padEnd(37)}║
║   Environment: ${config.nodeEnv.padEnd(33)}║
║   CORS Origin: ${config.clientOrigin.padEnd(32)}║
╚══════════════════════════════════════════════════╝
  `);
});

export default app;
