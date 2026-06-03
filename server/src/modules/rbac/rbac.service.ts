import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { Role, ROLE_HIERARCHY } from '../../common/enums/role.enum';
import { resolveRoleFromDiscord, resolveHybridRole, hasDatabaseOverride } from '../../common/utils/role-resolver';
import { config } from '../../config';

const prisma = new PrismaClient();

export const overrideSchema = z.object({
  targetDiscordId: z.string().min(1, 'targetDiscordId is required'),
  assignedRole: z.nativeEnum(Role, {
    errorMap: () => ({ message: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}` }),
  }),
  customPermissions: z.array(z.string()).default([]),
});

export type OverrideInput = z.infer<typeof overrideSchema>;

export interface RoleAssignmentResult {
  discordId: string;
  previousRole: Role;
  newRole: Role;
  source: 'discord' | 'database_override';
}

export interface PermissionCheckResult {
  discordId: string;
  role: Role;
  hierarchy: number;
  source: 'discord' | 'database_override';
  overrideActive: boolean;
  hasPermission: boolean;
  missingPermissions: string[];
}

export class RbacService {
  /**
   * Override a user's role and permissions.
   * Only callable by OWNER.
   * This creates/updates the RbacUser record with the explicit override,
   * which takes absolute priority over Discord role mapping.
   */
  async overrideRole(data: OverrideInput): Promise<RoleAssignmentResult> {
    const existing = await prisma.rbacUser.findUnique({
      where: { discordId: data.targetDiscordId },
    });

    const previousRole = existing?.role as Role | undefined;

    const updated = await prisma.rbacUser.upsert({
      where: { discordId: data.targetDiscordId },
      update: {
        role: data.assignedRole as any,
        permissions: JSON.stringify(data.customPermissions),
      },
      create: {
        discordId: data.targetDiscordId,
        role: data.assignedRole as any,
        permissions: JSON.stringify(data.customPermissions),
      },
    });

    return {
      discordId: data.targetDiscordId,
      previousRole: previousRole || Role.CITIZEN,
      newRole: updated.role as unknown as Role,
      source: 'database_override',
    };
  }

  /**
   * Assign role without override flag (used by Discord sync).
   * Will NOT overwrite an existing manual override.
   */
  async assignRole(discordId: string, newRole: Role): Promise<RoleAssignmentResult> {
    const existing = await prisma.rbacUser.findUnique({
      where: { discordId },
    });

    // If there's already a manual DB override, do NOT auto-overwrite it
    if (hasDatabaseOverride(existing)) {
      return {
        discordId,
        previousRole: existing!.role as unknown as Role,
        newRole: existing!.role as unknown as Role,
        source: 'database_override',
      };
    }

    const previousRole = (existing?.role as Role) || Role.CITIZEN;

    const updated = await prisma.rbacUser.upsert({
      where: { discordId },
      update: { role: newRole as any },
      create: { discordId, role: newRole as any },
    });

    return {
      discordId,
      previousRole,
      newRole: updated.role as unknown as Role,
      source: 'discord',
    };
  }

  /**
   * Re-sync Discord roles and resolve the effective role.
   * Respects existing DB overrides.
   */
  async syncRolesFromDiscord(discordId: string): Promise<void> {
    const account = await prisma.discordAccount.findUnique({
      where: { id: discordId },
    });

    if (!account || !account.accessToken) return;

    const { decryptToken } = await import('../../common/utils/crypto');
    const accessToken = decryptToken(account.accessToken, config.tokenEncryption.key);

    const { fetchGuildMember } = await import('../auth/strategies/discord.strategy');

    try {
      const member = await fetchGuildMember(accessToken, config.discord.guildId, discordId);
      const discordRoles = member.roles;

      // Update stored Discord roles
      await prisma.discordAccount.update({
        where: { id: discordId },
        data: { discordRoles: JSON.stringify(discordRoles) },
      });

      // Check if manual DB override exists
      const existingOverride = await prisma.rbacUser.findUnique({
        where: { discordId },
        select: { role: true, permissions: true },
      });

      const hasOverride = hasDatabaseOverride(existingOverride);

      if (!hasOverride) {
        // No override — auto-update from Discord
        const resolved = resolveRoleFromDiscord(discordRoles);
        await prisma.rbacUser.upsert({
          where: { discordId },
          update: { role: resolved.role as any },
          create: { discordId, role: resolved.role as any },
        });
      }
      // If override exists, do NOT touch the DB role
    } catch {
      // Silently fail — roles will sync on next login
    }
  }

  async addPermissions(discordId: string, permissions: string[]): Promise<void> {
    const existing = await prisma.rbacUser.findUnique({
      where: { discordId },
    });

    const currentPermissions = existing?.permissions
      ? (JSON.parse(existing.permissions) as string[])
      : [];

    const merged = [...new Set([...currentPermissions, ...permissions])];

    await prisma.rbacUser.upsert({
      where: { discordId },
      update: { permissions: JSON.stringify(merged) },
      create: { discordId, role: 'CITIZEN' as any, permissions: JSON.stringify(merged) },
    });
  }

  async removePermissions(discordId: string, permissions: string[]): Promise<void> {
    const existing = await prisma.rbacUser.findUnique({
      where: { discordId },
    });

    if (!existing?.permissions) return;

    const currentPermissions = JSON.parse(existing.permissions) as string[];
    const filtered = currentPermissions.filter((p) => !permissions.includes(p));

    await prisma.rbacUser.update({
      where: { discordId },
      data: { permissions: JSON.stringify(filtered) },
    });
  }

  async checkPermissions(discordId: string, requiredPermissions: string[]): Promise<PermissionCheckResult> {
    const [discordAccount, rbacUser] = await Promise.all([
      prisma.discordAccount.findUnique({
        where: { id: discordId },
        select: { discordRoles: true },
      }),
      prisma.rbacUser.findUnique({
        where: { discordId },
      }),
    ]);

    const discordRoles: string[] = discordAccount?.discordRoles
      ? (JSON.parse(discordAccount.discordRoles) as string[])
      : [];

    const dbOverride = rbacUser
      ? { role: rbacUser.role as string, permissions: rbacUser.permissions ? (JSON.parse(rbacUser.permissions) as string[]) : null }
      : null;

    const hybrid = resolveHybridRole(discordRoles, dbOverride);
    const userPermissions = hybrid.overrideActive && dbOverride?.permissions
      ? dbOverride.permissions
      : [];

    const missingPermissions = requiredPermissions.filter(
      (p) => !userPermissions.includes(p),
    );

    return {
      discordId,
      role: hybrid.role,
      hierarchy: ROLE_HIERARCHY[hybrid.role] || 0,
      source: hybrid.source,
      overrideActive: hybrid.overrideActive,
      hasPermission: missingPermissions.length === 0,
      missingPermissions,
    };
  }

  async getEffectiveRole(discordId: string): Promise<{
    discordId: string;
    role: Role;
    permissions: string[];
    source: 'discord' | 'database_override';
    overrideActive: boolean;
  }> {
    const [discordAccount, rbacUser] = await Promise.all([
      prisma.discordAccount.findUnique({
        where: { id: discordId },
        select: { discordRoles: true },
      }),
      prisma.rbacUser.findUnique({
        where: { discordId },
      }),
    ]);

    const discordRoles: string[] = discordAccount?.discordRoles
      ? (JSON.parse(discordAccount.discordRoles) as string[])
      : [];

    const dbOverride = rbacUser
      ? { role: rbacUser.role as string, permissions: rbacUser.permissions ? (JSON.parse(rbacUser.permissions) as string[]) : null }
      : null;

    const hybrid = resolveHybridRole(discordRoles, dbOverride);

    return {
      discordId,
      role: hybrid.role,
      permissions: dbOverride?.permissions || [],
      source: hybrid.source,
      overrideActive: hybrid.overrideActive,
    };
  }

  async getAllUsers(): Promise<Array<{
    discordId: string;
    discordTag: string | null;
    role: Role;
    permissions: string[];
    source: 'discord' | 'database_override';
    citizenid: string | null;
    lastLogin: Date;
  }>> {
    const users = await prisma.rbacUser.findMany({
      include: {
        discordAccount: {
          select: {
            citizenid: true,
            lastLogin: true,
            discordRoles: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => {
      const discordRoles: string[] = u.discordAccount?.discordRoles
        ? (JSON.parse(u.discordAccount.discordRoles) as string[])
        : [];

      const dbOverride = { role: u.role as string, permissions: null };
      const hybrid = resolveHybridRole(discordRoles, dbOverride);

      return {
        discordId: u.discordId,
        discordTag: null,
        role: u.role as unknown as Role,
        permissions: u.permissions ? JSON.parse(u.permissions) : [],
        source: hybrid.source,
        citizenid: u.discordAccount?.citizenid || null,
        lastLogin: u.discordAccount?.lastLogin || u.createdAt,
      };
    });
  }
}

export const rbacService = new RbacService();
