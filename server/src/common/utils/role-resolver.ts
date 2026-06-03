import { Role, ROLE_HIERARCHY, DISCORD_ROLE_MAP } from '../enums/role.enum';

/**
 * ROLE RESOLVER UTILITY
 *
 * Hybrid architecture: Discord is primary for automation,
 * but DB overrides take absolute priority.
 *
 * Flow:
 *   1. Fetch Discord guild member roles
 *   2. Map snowflakes -> Role via DISCORD_ROLE_MAP, pick highest
 *   3. Check RbacUser table for manual override
 *   4. If override exists -> use DB value
 *   5. If no override -> use Discord-mapped value
 */

export interface ResolvedRole {
  role: Role;
  source: 'discord' | 'database_override';
  discordRoles: string[];
  overrideActive: boolean;
}

/**
 * Step 1: Map Discord snowflake roles to application Role enum.
 * Scans all user's Discord roles and returns the highest-ranking match.
 */
export function resolveRoleFromDiscord(discordRoles: string[]): {
  role: Role;
  matchedSnowflakes: string[];
} {
  if (!discordRoles || discordRoles.length === 0) {
    return { role: Role.CITIZEN, matchedSnowflakes: [] };
  }

  const matched: Array<{ snowflake: string; role: Role }> = [];

  for (const snowflake of discordRoles) {
    const mappedRole = DISCORD_ROLE_MAP[snowflake];
    if (mappedRole) {
      matched.push({ snowflake, role: mappedRole });
    }
  }

  if (matched.length === 0) {
    return { role: Role.CITIZEN, matchedSnowflakes: [] };
  }

  // Sort by hierarchy descending, pick the highest
  matched.sort((a, b) => (ROLE_HIERARCHY[b.role] || 0) - (ROLE_HIERARCHY[a.role] || 0));

  const highest = matched[0];

  return {
    role: highest.role,
    matchedSnowflakes: matched.map((m) => m.snowflake),
  };
}

/**
 * Step 2: Resolve final role using Hybrid logic.
 *
 * If a DB override exists (from RbacUser table), use it.
 * Otherwise fall back to the Discord-mapped role.
 */
export function resolveHybridRole(
  discordRoles: string[],
  dbOverride: { role?: string | null; permissions?: string[] | null } | null,
): ResolvedRole {
  // Always resolve Discord roles first
  const discordResult = resolveRoleFromDiscord(discordRoles);
  const hasDbOverride = !!(dbOverride && dbOverride.role);

  if (hasDbOverride && dbOverride!.role) {
    // Validate that the override is a valid Role enum value
    const overrideRole = dbOverride!.role as Role;
    if (Object.values(Role).includes(overrideRole)) {
      return {
        role: overrideRole,
        source: 'database_override',
        discordRoles,
        overrideActive: true,
      };
    }
  }

  return {
    role: discordResult.role,
    source: 'discord',
    discordRoles,
    overrideActive: false,
  };
}

/**
 * Quick check: given a discordId's DB record, does an override exist?
 */
export function hasDatabaseOverride(dbUser: {
  role?: string | null;
  permissions?: string | null;
} | null): boolean {
  if (!dbUser) return false;
  if (dbUser.role && dbUser.role !== 'CITIZEN') return true;
  if (dbUser.permissions) {
    try {
      const perms = JSON.parse(dbUser.permissions) as string[];
      return perms.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}
