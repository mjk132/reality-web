const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, ...fetchOpts } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOpts.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOpts,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'UNKNOWN_ERROR',
      message: `HTTP ${response.status}`,
    }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Auth API ─────────────────────────────────────────────────

export const authApi = {
  login: (): string => {
    return `${API_BASE}/api/auth/login`;
  },

  handleCallback: (code: string) =>
    fetchApi<{ token: string; user: AuthUser }>(`/api/auth/callback?code=${code}`),

  getMe: (token: string) =>
    fetchApi<AuthUser>('/api/auth/me', { token }),

  refreshSession: (token: string) =>
    fetchApi<{ token: string; user: AuthUser }>('/api/auth/refresh', {
      method: 'POST',
      token,
    }),

  logout: (token: string) =>
    fetchApi<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      token,
    }),
};

// ─── RBAC API ─────────────────────────────────────────────────

export const rbacApi = {
  getProfile: (token: string) =>
    fetchApi<RbacProfile>('/api/rbac/profile', { token }),

  syncRoles: (token: string) =>
    fetchApi<{ message: string }>('/api/rbac/sync', {
      method: 'POST',
      token,
    }),

  getAllUsers: (token: string) =>
    fetchApi<RbacUserRecord[]>('/api/rbac/users', { token }),

  assignRole: (token: string, discordId: string, role: string) =>
    fetchApi<{ discordId: string; previousRole: string; newRole: string }>(
      '/api/rbac/assign',
      {
        method: 'POST',
        token,
        body: JSON.stringify({ discordId, role }),
      },
    ),
};

// ─── Types ────────────────────────────────────────────────────

export interface AuthUser {
  discordId: string;
  username: string;
  avatar: string | null;
  role: string;
  citizenid: string | null;
  permissions: string[];
}

export interface RbacProfile {
  discordId: string;
  role: string;
  hierarchy: number;
  hasPermission: boolean;
  missingPermissions: string[];
}

export interface RbacUserRecord {
  discordId: string;
  discordTag: string | null;
  role: string;
  permissions: string[];
  citizenid: string | null;
  lastLogin: string;
}
