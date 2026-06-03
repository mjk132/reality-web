import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Role, hasMinimumRole, ROLE_HIERARCHY } from '../common/enums/role.enum';
import { resolveHybridRole, ResolvedRole } from '../common/utils/role-resolver';

const prisma = new PrismaClient();

/**
 * Fetch the effective role for a user by applying Hybrid resolution:
 *
 * 1. Read the user's Discord roles from DiscordAccount (stored at login).
 * 2. Check RbacUser for any manual DB override.
 * 3. If override exists → DB role takes absolute priority.
 * 4. If no override → Discord-mapped role is used.
 *
 * This runs on EVERY guarded request, ensuring instant override生效
 * without requiring the user to re-login.
 */
async function resolveEffectiveRole(discordId: string): Promise<{
  role: Role;
  permissions: string[];
  source: 'discord' | 'database_override';
}> {
  // Parallel fetch: Discord roles + DB override
  const [discordAccount, rbacUser] = await Promise.all([
    prisma.discordAccount.findUnique({
      where: { id: discordId },
      select: { discordRoles: true },
    }),
    prisma.rbacUser.findUnique({
      where: { discordId },
      select: { role: true, permissions: true },
    }),
  ]);

  const discordRoles: string[] = discordAccount?.discordRoles
    ? (JSON.parse(discordAccount.discordRoles) as string[])
    : [];

  const dbOverride = rbacUser
    ? { role: rbacUser.role as string | null, permissions: rbacUser.permissions ? (JSON.parse(rbacUser.permissions) as string[]) : null }
    : null;

  const resolved: ResolvedRole = resolveHybridRole(discordRoles, dbOverride);

  return {
    role: resolved.role,
    permissions: dbOverride?.permissions || [],
    source: resolved.source,
  };
}

/**
 * requireRole: Checks that the authenticated user has one of the
 * specified allowed roles.
 *
 * Hybrid resolution is performed on EVERY invocation:
 * - Discord roles mapped via DISCORD_ROLE_MAP
 * - DB override from RbacUser takes absolute priority
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    try {
      const effective = await resolveEffectiveRole(user.discordId);

      if (!allowedRoles.includes(effective.role)) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient role permissions',
          required: allowedRoles,
          current: effective.role,
          source: effective.source,
        });
        return;
      }

      // Attach resolved info to request for downstream use
      (req as any).effectiveRole = effective;

      next();
    } catch (error) {
      console.error('[RBAC Guard] Resolution error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Role resolution failed',
      });
    }
  };
}

/**
 * requireMinimumRole: Checks that the user's role meets or exceeds
 * a minimum hierarchy level.
 */
export function requireMinimumRole(minimumRole: Role) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    try {
      const effective = await resolveEffectiveRole(user.discordId);

      if (!hasMinimumRole(effective.role, minimumRole)) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient role hierarchy level',
          requiredMinimum: minimumRole,
          current: effective.role,
          source: effective.source,
        });
        return;
      }

      (req as any).effectiveRole = effective;
      next();
    } catch (error) {
      console.error('[RBAC Guard] Resolution error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Role resolution failed',
      });
    }
  };
}

/**
 * requirePermission: Checks that the user has all required permissions.
 * Permissions are sourced from RbacUser.permissions (DB override).
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    try {
      const effective = await resolveEffectiveRole(user.discordId);
      const userPermissions = effective.permissions || [];

      const hasAll = requiredPermissions.every((perm) => userPermissions.includes(perm));

      if (!hasAll) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Missing required permissions',
          required: requiredPermissions,
        });
        return;
      }

      (req as any).effectiveRole = effective;
      next();
    } catch (error) {
      console.error('[RBAC Guard] Permission resolution error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Permission resolution failed',
      });
    }
  };
}
