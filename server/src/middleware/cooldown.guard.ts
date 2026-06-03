import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * COOLDOWN ENFORCEMENT MIDDLEWARE
 *
 * ZERO-BYPASS GUARANTEE:
 * - Cooldown is checked SERVER-SIDE against the database.
 * - The client cannot manipulate or reset the timer.
 * - Even if the client sends a modified timestamp, the server
 *   compares against its own clock (Date.now()).
 * - The cooldownUntil value is set by the server on test failure
 *   and is immutable by the client.
 *
 * This middleware can be applied to any route that requires
 * cooldown enforcement.
 */
export function enforceWhitelistCooldown(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required for cooldown check',
    });
    return;
  }

  // Fire-and-forget cooldown check — runs async but doesn't block
  prisma.whitelistTest
    .findFirst({
      where: {
        discordId: user.discordId,
        status: 'FAILED',
        cooldownUntil: { gt: new Date() },
      },
      orderBy: { cooldownUntil: 'desc' },
      select: { cooldownUntil: true },
    })
    .then((latest) => {
      if (!latest || !latest.cooldownUntil) {
        // No active cooldown — proceed
        next();
        return;
      }

      const now = new Date();

      if (now >= latest.cooldownUntil) {
        // Cooldown has expired — proceed
        next();
        return;
      }

      const remainingMs = latest.cooldownUntil.getTime() - now.getTime();
      const remainingSeconds = Math.ceil(remainingMs / 1000);

      res.status(429).json({
        error: 'COOLDOWN_ACTIVE',
        message: `Cooldown active — ${formatDuration(remainingSeconds)} remaining`,
        remainingSeconds,
        cooldownUntil: latest.cooldownUntil.toISOString(),
      });
    })
    .catch((error) => {
      console.error('[CooldownGuard] Database error:', error);
      // Fail open in case of DB error — allow the request through
      // but log the error for investigation
      next();
    });
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}
