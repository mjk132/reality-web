export interface AuthResult {
  token: string;
  user: AuthUser;
}

export interface AuthUser {
  discordId: string;
  username: string;
  avatar: string | null;
  role: Role;
  citizenid: string | null;
  permissions: string[];
}

export enum Role {
  OWNER = 'OWNER',
  HIGH_MANAGEMENT = 'HIGH_MANAGEMENT',
  DEV_DIRECTOR = 'DEV_DIRECTOR',
  DIRECTOR = 'DIRECTOR',
  ORGANIZER = 'ORGANIZER',
  STAFF = 'STAFF',
  CITIZEN = 'CITIZEN',
}

export interface LoginResponse extends AuthResult {}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}
