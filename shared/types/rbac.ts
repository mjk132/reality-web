import { Role } from './auth';

export interface RbacProfile {
  discordId: string;
  role: Role;
  hierarchy: number;
  hasPermission: boolean;
  missingPermissions: string[];
}

export interface RoleAssignment {
  discordId: string;
  previousRole: Role;
  newRole: Role;
}

export interface RbacUserRecord {
  discordId: string;
  discordTag: string | null;
  role: Role;
  permissions: string[];
  citizenid: string | null;
  lastLogin: string;
}

export interface RoleHierarchy {
  role: Role;
  level: number;
}

export const ROLE_HIERARCHY_MAP: Record<Role, number> = {
  [Role.OWNER]: 100,
  [Role.HIGH_MANAGEMENT]: 90,
  [Role.DEV_DIRECTOR]: 80,
  [Role.DIRECTOR]: 70,
  [Role.ORGANIZER]: 60,
  [Role.STAFF]: 50,
  [Role.CITIZEN]: 10,
};
