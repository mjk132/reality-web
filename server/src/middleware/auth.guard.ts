import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../common/utils/jwt';
import { Role } from '../common/enums/role.enum';

export interface AuthenticatedUser {
  discordId: string;
  citizenid?: string;
  role: Role;
  permissions: string[];
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Missing or malformed authorization header',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Token not provided',
      });
      return;
    }

    const decoded: JwtPayload = verifyToken(token);

    (req as any).user = {
      discordId: decoded.discordId,
      citizenid: decoded.citizenid,
      role: decoded.role as Role,
      permissions: decoded.permissions,
    };

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message,
    });
  }
}
