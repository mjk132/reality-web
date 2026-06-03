import { CorsOptions } from 'cors';
import { config } from './index';

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Railway healthchecks)
    if (!origin) {
      callback(null, true);
      return;
    }

    // In demo mode, allow all origins (sandbox environment)
    if (config.demoMode) {
      callback(null, true);
      return;
    }

    // Production: strict origin check
    const allowedOrigins = [
      config.clientOrigin,
      'http://localhost:3000',
      'http://localhost:3001',
      // Railway auto-generated domains
      ...(process.env.RAILWAY_STATIC_URL ? [process.env.RAILWAY_STATIC_URL] : []),
      ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Remaining'],
  maxAge: 86400,
};
