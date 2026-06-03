export enum Role {
  OWNER = 'OWNER',
  HIGH_MANAGEMENT = 'HIGH_MANAGEMENT',
  DEV_DIRECTOR = 'DEV_DIRECTOR',
  DIRECTOR = 'DIRECTOR',
  ORGANIZER = 'ORGANIZER',
  STAFF = 'STAFF',
  CITIZEN = 'CITIZEN',
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.OWNER]: 100,
  [Role.HIGH_MANAGEMENT]: 90,
  [Role.DEV_DIRECTOR]: 80,
  [Role.DIRECTOR]: 70,
  [Role.ORGANIZER]: 60,
  [Role.STAFF]: 50,
  [Role.CITIZEN]: 10,
};

function getDemoRoleMap(): Record<string, Role> {
  return {
    [process.env.MOCK_OWNER_ROLE_ID || '1111222233334444']: Role.OWNER,
    [process.env.MOCK_HIGH_MGMT_ROLE_ID || '5555666677778888']: Role.HIGH_MANAGEMENT,
    [process.env.MOCK_DIRECTOR_ROLE_ID || '9999000011112222']: Role.DIRECTOR,
    [process.env.MOCK_ORGANIZER_ROLE_ID || '3333444455556666']: Role.ORGANIZER,
    [process.env.MOCK_STAFF_ROLE_ID || '7777888899990000']: Role.STAFF,
  };
}

// Default production placeholders — override with env vars
export const DISCORD_ROLE_MAP: Record<string, Role> = process.env.DEMO_MODE === 'true'
  ? getDemoRoleMap()
  : {
      "123456789012345678": Role.OWNER,
      "234567890123456789": Role.HIGH_MANAGEMENT,
      "345678901234567890": Role.DEV_DIRECTOR,
      "456789012345678901": Role.DIRECTOR,
      "556789012345678902": Role.ORGANIZER,
      "656789012345678903": Role.STAFF,
    };

export function hasMinimumRole(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
