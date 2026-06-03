import { Request, Response } from 'express';
import { authService, AuthResult } from './auth.service';
import { DISCORD_AUTH_URL } from './strategies/discord.strategy';

export class AuthController {
  async loginRedirect(_req: Request, res: Response): Promise<void> {
    res.redirect(DISCORD_AUTH_URL);
  }

  async callback(req: Request, res: Response): Promise<void> {
    const { code } = req.query as { code?: string };

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Authorization code is required',
      });
      return;
    }

    const result: AuthResult = await authService.handleCallback(code);

    res.cookie('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json(result);
  }

  async refreshSession(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const result = await authService.refreshSession(user.discordId);

    if (!result) {
      res.status(401).json({
        error: 'SESSION_EXPIRED',
        message: 'Unable to refresh session — re-authentication required',
      });
      return;
    }

    res.cookie('session_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json(result);
  }

  async getMe(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const result = await authService.getSession(user.discordId);

    if (!result) {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'User session not found',
      });
      return;
    }

    res.json(result.user);
  }

  async demoLogin(req: Request, res: Response): Promise<void> {
    const { role } = req.body as { role?: string };
    if (!role || !['OWNER', 'HIGH_MANAGEMENT', 'DIRECTOR', 'ORGANIZER', 'STAFF', 'CITIZEN'].includes(role)) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Valid role required: OWNER, HIGH_MANAGEMENT, DIRECTOR, ORGANIZER, STAFF, or CITIZEN' });
      return;
    }

    try {
      const result = await authService.demoLogin(role);
      res.cookie('session_token', result.token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: 'DEMO_ERROR', message: error.message });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    await authService.revokeSession(user.discordId);

    res.clearCookie('session_token');
    res.json({ message: 'Session revoked successfully' });
  }
}

export const authController = new AuthController();
