import jwt from 'jsonwebtoken';
import { config } from '../../config';

export interface JwtPayload {
  discordId: string;
  citizenid?: string;
  role: string;
  permissions: string[];
}

const SECRET = config.jwt.secret;

export function signToken(payload: JwtPayload): string {
  const expiresInSeconds = 24 * 60 * 60;
  return jwt.sign(payload, SECRET, {
    expiresIn: expiresInSeconds,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, SECRET, {
      issuer: 'reality-web',
      audience: 'reality-portal',
    }) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired — re-authentication required');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token — authentication failed');
    }
    throw new Error('Token verification failed');
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
