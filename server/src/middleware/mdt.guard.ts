import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const POLICE_JOBS = new Set(['police', 'sheriff', 'statepolice', 'lspd', 'bcso', 'sasp']);

/**
 * MDT Job Guard: Verifies the authenticated user has a police job
 * by querying the qb-core players table.
 *
 * This runs on every MDT request to ensure only active officers
 * can access sensitive criminal data.
 */
export function requirePoliceJob() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    if (!user?.citizenid) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Character not linked' });
      return;
    }

    try {
      const players = await prisma.$queryRawUnsafe<Array<{ job: string }>>(
        'SELECT job FROM players WHERE citizenid = ? LIMIT 1',
        [user.citizenid],
      );

      if (players.length === 0) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Player not found in database' });
        return;
      }

      let jobData: { name?: string; label?: string } | null = null;
      try { jobData = JSON.parse(players[0].job); } catch { /* ignore */ }

      const jobName = jobData?.name || '';
      if (!POLICE_JOBS.has(jobName)) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Only active police officers can access MDT',
          currentJob: jobName,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[MDT Guard] Job verification error:', error);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Job verification failed' });
    }
  };
}

/**
 * requireDirectorOrHigher: Only Director+ can edit/delete cases.
 * Uses the already-resolved effective role from RBAC guard.
 */
export function requireDirectorOrHigher(req: Request, res: Response, next: NextFunction): void {
  const effective = (req as any).effectiveRole;
  if (!effective) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' });
    return;
  }

  const hierarchy: Record<string, number> = {
    OWNER: 100,
    HIGH_MANAGEMENT: 90,
    DEV_DIRECTOR: 80,
    DIRECTOR: 70,
  };

  const userLevel = hierarchy[effective.role as string] || 0;
  if (userLevel < 70) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Only Director rank or higher can modify case records',
      currentRole: effective.role,
    });
    return;
  }

  next();
}
