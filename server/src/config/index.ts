import dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Railway injects env vars directly — skip local .env files
if (!process.env.RAILWAY_SERVICE_ID) {
  const envFile = process.env.DEMO_MODE === 'true' ? '.env.demo' : '.env';
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  demoMode: process.env.DEMO_MODE === 'true',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
    guildId: process.env.DISCORD_GUILD_ID || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    webhookWarrants: process.env.DISCORD_WEBHOOK_WARRANTS || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  tokenEncryption: {
    key: process.env.TOKEN_ENCRYPTION_KEY || 'default-encryption-key-32chars!!',
  },

  redis: {
    url: process.env.REDIS_URL || '',
  },
} as const;
