import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { encryptToken, decryptToken } from '../../common/utils/crypto';
import { signToken } from '../../common/utils/jwt';
import { resolveHybridRole } from '../../common/utils/role-resolver';
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchDiscordUser,
  fetchGuildMember,
  DiscordTokenResponse,
  DiscordUser,
} from './strategies/discord.strategy';
import { Role } from '../../common/enums/role.enum';

const prisma = new PrismaClient();

export interface AuthResult {
  token: string;
  user: {
    discordId: string;
    username: string;
    avatar: string | null;
    role: Role;
    citizenid: string | null;
    permissions: string[];
  };
}

export class AuthService {
  async handleCallback(code: string): Promise<AuthResult> {
    // 1. Exchange authorization code for tokens
    const tokenResponse: DiscordTokenResponse = await exchangeCodeForTokens(code);

    // 2. Fetch Discord user info
    const discordUser: DiscordUser = await fetchDiscordUser(tokenResponse.access_token);

    // 3. Encrypt tokens before storage (AES-256-GCM)
    const encryptedAccessToken = encryptToken(
      tokenResponse.access_token,
      config.tokenEncryption.key,
    );
    const encryptedRefreshToken = encryptToken(
      tokenResponse.refresh_token,
      config.tokenEncryption.key,
    );

    // 4. Fetch guild member to get Discord roles
    let discordRoles: string[] = [];
    try {
      const member = await fetchGuildMember(
        tokenResponse.access_token,
        config.discord.guildId,
        discordUser.id,
      );
      discordRoles = member.roles;
    } catch {
      // Non-critical — user may not be in guild
    }

    // 5. Resolve role using Hybrid engine (Discord mapping + DB override check)
    const existingOverride = await prisma.rbacUser.findUnique({
      where: { discordId: discordUser.id },
      select: { role: true, permissions: true },
    });

    const hybrid = resolveHybridRole(discordRoles, existingOverride
      ? { role: existingOverride.role as string, permissions: existingOverride.permissions ? JSON.parse(existingOverride.permissions) as string[] : null }
      : null,
    );

    const finalRole = hybrid.role;

    // 6. Upsert Discord account (create or update)
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    await prisma.discordAccount.upsert({
      where: { id: discordUser.id },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        discordRoles: JSON.stringify(discordRoles),
        lastLogin: new Date(),
      },
      create: {
        id: discordUser.id,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        discordRoles: JSON.stringify(discordRoles),
      },
    });

    // 7. Upsert RBAC entry (only update if no manual override exists)
    if (!hybrid.overrideActive) {
      await prisma.rbacUser.upsert({
        where: { discordId: discordUser.id },
        update: { role: finalRole as any },
        create: { discordId: discordUser.id, role: finalRole as any },
      });
    }

    // 8. Fetch citizenid from DiscordAccount
    const account = await prisma.discordAccount.findUnique({
      where: { id: discordUser.id },
      select: { citizenid: true },
    });

    // 9. Sign JWT with the hybrid-resolved role
    const overrideUser = await prisma.rbacUser.findUnique({
      where: { discordId: discordUser.id },
      select: { role: true, permissions: true },
    });

    const effectivePermissions = overrideUser?.permissions
      ? (JSON.parse(overrideUser.permissions) as string[])
      : [];
    const effectiveRole = overrideUser?.role as string || finalRole as string;

    const token = signToken({
      discordId: discordUser.id,
      citizenid: account?.citizenid || undefined,
      role: effectiveRole,
      permissions: effectivePermissions,
    });

    // 10. Build avatar URL
    let avatar: string | null = null;
    if (discordUser.avatar) {
      const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
      avatar = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}`;
    }

      return {
        token,
        user: {
          discordId: discordUser.id,
          username: discordUser.username,
          avatar,
          role: effectiveRole as unknown as Role,
          citizenid: account?.citizenid || null,
          permissions: effectivePermissions,
        },
      };
  }

  async refreshSession(discordId: string): Promise<AuthResult | null> {
    const account = await prisma.discordAccount.findUnique({
      where: { id: discordId },
      include: { rbacUser: true },
    });

    if (!account || !account.refreshToken) return null;

    try {
      // Decrypt refresh token
      const decryptedRefresh = decryptToken(account.refreshToken, config.tokenEncryption.key);

      // Exchange for new tokens
      const tokenResponse: DiscordTokenResponse = await refreshAccessToken(decryptedRefresh);

      // Re-encrypt and store
      const encryptedAccessToken = encryptToken(
        tokenResponse.access_token,
        config.tokenEncryption.key,
      );
      const encryptedRefreshToken = encryptToken(
        tokenResponse.refresh_token,
        config.tokenEncryption.key,
      );

      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      await prisma.discordAccount.update({
        where: { id: discordId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt,
          lastLogin: new Date(),
        },
      });

      // Fetch Discord user for display info
      const discordUser: DiscordUser = await fetchDiscordUser(tokenResponse.access_token);

      // Sign new JWT
      const permissions = JSON.parse(account.rbacUser?.permissions || '[]') as string[];
      const userRole = (account.rbacUser?.role as string) || 'CITIZEN';
      const token = signToken({
        discordId,
        citizenid: account.citizenid || undefined,
        role: userRole,
        permissions,
      });

      let avatar: string | null = null;
      if (discordUser.avatar) {
        const ext = discordUser.avatar.startsWith('a_') ? 'gif' : 'png';
        avatar = `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}`;
      }

      return {
        token,
        user: {
          discordId: discordUser.id,
          username: discordUser.username,
          avatar,
          role: userRole as Role,
          citizenid: account.citizenid || null,
          permissions,
        },
      };
    } catch {
      return null;
    }
  }

  async getSession(discordId: string): Promise<AuthResult | null> {
    const account = await prisma.discordAccount.findUnique({
      where: { id: discordId },
      include: { rbacUser: true },
    });

    if (!account || !account.rbacUser) return null;

    const permissions = JSON.parse(account.rbacUser.permissions || '[]') as string[];
    const userRole = account.rbacUser.role as string;
    const token = signToken({
      discordId,
      citizenid: account.citizenid || undefined,
      role: userRole,
      permissions,
    });

    return {
      token,
      user: {
        discordId,
        username: '',
        avatar: null,
        role: userRole as Role,
        citizenid: account.citizenid || null,
        permissions,
      },
    };
  }

  async revokeSession(discordId: string): Promise<void> {
    await prisma.discordAccount.update({
      where: { id: discordId },
      data: { expiresAt: new Date(0) },
    });
  }

  /**
   * Demo login: Creates a mock DiscordAccount and RbacUser
   * without a real Discord OAuth handshake.
   * ONLY available when DEMO_MODE=true.
   */
  async demoLogin(roleKey: string): Promise<AuthResult> {
    const mockDiscordId = `demo_${roleKey.toLowerCase()}_${Date.now()}`;
    const mockRoleMap: Record<string, string> = {
      OWNER: process.env.MOCK_OWNER_ROLE_ID || '1111222233334444',
      HIGH_MANAGEMENT: process.env.MOCK_HIGH_MGMT_ROLE_ID || '5555666677778888',
      DIRECTOR: process.env.MOCK_DIRECTOR_ROLE_ID || '9999000011112222',
      ORGANIZER: process.env.MOCK_ORGANIZER_ROLE_ID || '3333444455556666',
      STAFF: process.env.MOCK_STAFF_ROLE_ID || '7777888899990000',
      CITIZEN: '0000000000000000',
    };

    const mockRole = mockRoleMap[roleKey];
    if (!mockRole) throw new Error(`Invalid demo role: ${roleKey}`);

    const citizenidMap: Record<string, string> = {
      OWNER: 'DEMO001',
      HIGH_MANAGEMENT: 'DEMO002',
      DIRECTOR: 'DEMO004',
      ORGANIZER: 'DEMO005',
      STAFF: 'DEMO006',
      CITIZEN: 'DEMO003',
    };
    const nameMap: Record<string, string> = {
      OWNER: 'Reality Founder',
      HIGH_MANAGEMENT: 'High Manager',
      DIRECTOR: 'Operations Director',
      ORGANIZER: 'Event Organizer',
      STAFF: 'Staff Member',
      CITIZEN: 'Test Citizen',
    };

    const mockCitizenid = citizenidMap[roleKey] || 'DEMO003';
    const mockName = nameMap[roleKey] || 'Demo User';

    await prisma.discordAccount.upsert({
      where: { id: mockDiscordId },
      update: {
        accessToken: 'demo_encrypted_token',
        refreshToken: 'demo_encrypted_token',
        expiresAt: new Date(Date.now() + 86400000),
        discordRoles: JSON.stringify([mockRole]),
        citizenid: mockCitizenid,
        lastLogin: new Date(),
      },
      create: {
        id: mockDiscordId,
        accessToken: 'demo_encrypted_token',
        refreshToken: 'demo_encrypted_token',
        expiresAt: new Date(Date.now() + 86400000),
        discordRoles: JSON.stringify([mockRole]),
        citizenid: mockCitizenid,
      },
    });

    await prisma.rbacUser.upsert({
      where: { discordId: mockDiscordId },
      update: { role: roleKey as any },
      create: { discordId: mockDiscordId, role: roleKey as any },
    });

    const token = signToken({
      discordId: mockDiscordId,
      citizenid: mockCitizenid,
      role: roleKey,
      permissions: [],
    });

    return {
      token,
      user: {
        discordId: mockDiscordId,
        username: mockName,
        avatar: null,
        role: roleKey as unknown as Role,
        citizenid: mockCitizenid,
        permissions: [],
      },
    };
  }

}

export const authService = new AuthService();
