import { config } from '../../../config';

const SCOPES = ['identify', 'guilds', 'guilds.members.read'];

export const DISCORD_AUTH_URL = `https://discord.com/api/oauth2/authorize` +
  `?client_id=${config.discord.clientId}` +
  `&redirect_uri=${encodeURIComponent(config.discord.redirectUri)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES.join(' '))}`;

export interface DiscordTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified?: boolean;
}

export interface DiscordGuildMember {
  roles: string[];
  nick: string | null;
  avatar: string | null;
  user: DiscordUser;
}

export async function exchangeCodeForTokens(code: string): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.discord.redirectUri,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord token exchange failed: ${response.status} ${error}`);
  }

  return response.json() as Promise<DiscordTokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error('Discord token refresh failed');
  }

  return response.json() as Promise<DiscordTokenResponse>;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Discord user');
  }

  return response.json() as Promise<DiscordUser>;
}

export async function fetchGuildMember(
  accessToken: string,
  guildId: string,
  userId: string,
): Promise<DiscordGuildMember> {
  const response = await fetch(
    `https://discord.com/api/users/@me/guilds/${guildId}/member`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch guild member: ${response.status}`);
  }

  return response.json() as Promise<DiscordGuildMember>;
}

export async function fetchGuildRoles(
  botToken: string,
  guildId: string,
): Promise<Array<{ id: string; name: string; position: number }>> {
  const response = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch guild roles');
  }

  return response.json() as Promise<Array<{ id: string; name: string; position: number }>>;
}
