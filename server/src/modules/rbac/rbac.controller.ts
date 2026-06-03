import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { rbacService, overrideSchema, OverrideInput } from './rbac.service';
import { Role } from '../../common/enums/role.enum';

function getUser(req: Request) {
  return (req as any).user;
}

export class RbacController {
  async getProfile(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const result = await rbacService.checkPermissions(user.discordId, []);
    res.json(result);
  }

  async getEffectiveRole(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    const result = await rbacService.getEffectiveRole(user.discordId);
    res.json(result);
  }

  /**
   * PATCH /api/v1/admin/rbac/override
   *
   * Strictly OWNER-only. Uses Zod schema validation to prevent
   * privilege escalation exploits.
   */
  async overrideRole(req: Request, res: Response): Promise<void> {
    try {
      const parsed: OverrideInput = overrideSchema.parse(req.body);

      // Prevent privilege escalation: an override cannot assign
      // a role higher than OWNER (there is none), but we validate
      // the role is a valid enum value (Zod already does this).
      // Additional safety: log the override action.
      const user = getUser(req);
      const result = await rbacService.overrideRole(parsed);

      console.log(
        `[RBAC] Override by ${user?.discordId}: ` +
        `${result.discordId} ${result.previousRole} -> ${result.newRole}` +
        ` permissions: [${parsed.customPermissions.join(', ')}]`,
      );

      res.json({
        ...result,
        customPermissions: parsed.customPermissions,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid override payload',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      throw error;
    }
  }

  async assignRole(req: Request, res: Response): Promise<void> {
    const { discordId, role } = req.body as { discordId: string; role: Role };

    if (!discordId || !role) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'discordId and role are required',
      });
      return;
    }

    if (!Object.values(Role).includes(role)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}`,
      });
      return;
    }

    const result = await rbacService.assignRole(discordId, role);
    res.json(result);
  }

  async syncRoles(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    if (!user) { res.status(401).json({ error: 'UNAUTHORIZED', message: 'Auth required' }); return; }

    await rbacService.syncRolesFromDiscord(user.discordId);
    res.json({ message: 'Roles synced successfully' });
  }

  async addPermissions(req: Request, res: Response): Promise<void> {
    const { discordId, permissions } = req.body as {
      discordId: string;
      permissions: string[];
    };

    if (!discordId || !Array.isArray(permissions) || permissions.length === 0) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'discordId and permissions array are required',
      });
      return;
    }

    await rbacService.addPermissions(discordId, permissions);
    res.json({ message: 'Permissions added successfully' });
  }

  async removePermissions(req: Request, res: Response): Promise<void> {
    const { discordId, permissions } = req.body as {
      discordId: string;
      permissions: string[];
    };

    if (!discordId || !Array.isArray(permissions) || permissions.length === 0) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'discordId and permissions array are required',
      });
      return;
    }

    await rbacService.removePermissions(discordId, permissions);
    res.json({ message: 'Permissions removed successfully' });
  }

  async getAllUsers(req: Request, res: Response): Promise<void> {
    const users = await rbacService.getAllUsers();
    res.json(users);
  }
}

export const rbacController = new RbacController();
