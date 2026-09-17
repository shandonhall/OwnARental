import { Role } from '../generated/prisma/enums';

/**
 * Domain capabilities for Own A Rental staff.
 * Roles map to these centrally — controllers use @RequirePermissions, not ad-hoc role lists.
 */
export const Permission = {
  DASHBOARD_READ: 'DASHBOARD_READ',
  SEARCH_READ: 'SEARCH_READ',

  CLIENTS_READ: 'CLIENTS_READ',
  CLIENTS_WRITE: 'CLIENTS_WRITE',
  CLIENTS_DELETE: 'CLIENTS_DELETE',

  CONTRACTS_READ: 'CONTRACTS_READ',
  /** Full Schedule A commercial / all-in breakdown and CIP amounts */
  CONTRACTS_FINANCE_READ: 'CONTRACTS_FINANCE_READ',
  CONTRACTS_WRITE: 'CONTRACTS_WRITE',
  CONTRACTS_DELETE: 'CONTRACTS_DELETE',

  FINANCE_READ: 'FINANCE_READ',
  FINANCE_WRITE: 'FINANCE_WRITE',

  FLEET_READ: 'FLEET_READ',
  FLEET_WRITE: 'FLEET_WRITE',
  FLEET_DELETE: 'FLEET_DELETE',

  TELEMATICS_READ: 'TELEMATICS_READ',
  TELEMATICS_SYNC: 'TELEMATICS_SYNC',
  TELEMATICS_IMMOBILIZE: 'TELEMATICS_IMMOBILIZE',

  FINES_READ: 'FINES_READ',
  FINES_WRITE: 'FINES_WRITE',

  LICENCES_READ: 'LICENCES_READ',
  LICENCES_WRITE: 'LICENCES_WRITE',

  LEADS_READ: 'LEADS_READ',
  LEADS_WRITE: 'LEADS_WRITE',
  LEADS_ASSIGN: 'LEADS_ASSIGN',
  LEADS_REPORTS: 'LEADS_REPORTS',

  END_OF_TERM_READ: 'END_OF_TERM_READ',
  END_OF_TERM_WRITE: 'END_OF_TERM_WRITE',

  NOTIFICATIONS_READ: 'NOTIFICATIONS_READ',
  NOTIFICATIONS_WRITE: 'NOTIFICATIONS_WRITE',

  AUTOMATION_READ: 'AUTOMATION_READ',
  AUTOMATION_MANAGE: 'AUTOMATION_MANAGE',

  USERS_MANAGE: 'USERS_MANAGE',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

const FLEET_OPS: Permission[] = [
  Permission.DASHBOARD_READ,
  Permission.SEARCH_READ,
  Permission.CLIENTS_READ,
  Permission.CLIENTS_WRITE,
  Permission.CONTRACTS_READ,
  Permission.FLEET_READ,
  Permission.FLEET_WRITE,
  Permission.TELEMATICS_READ,
  Permission.TELEMATICS_SYNC,
  Permission.FINES_READ,
  Permission.FINES_WRITE,
  Permission.LICENCES_READ,
  Permission.LICENCES_WRITE,
  Permission.END_OF_TERM_READ,
  Permission.END_OF_TERM_WRITE,
  Permission.NOTIFICATIONS_READ,
  Permission.NOTIFICATIONS_WRITE,
  Permission.AUTOMATION_READ,
];

const ADMIN_OPS: Permission[] = [
  ...FLEET_OPS,
  Permission.CLIENTS_DELETE,
  Permission.CONTRACTS_FINANCE_READ,
  Permission.CONTRACTS_WRITE,
  Permission.CONTRACTS_DELETE,
  Permission.FINANCE_READ,
  Permission.FINANCE_WRITE,
  Permission.FLEET_DELETE,
  Permission.AUTOMATION_MANAGE,
  Permission.LEADS_READ,
  Permission.LEADS_WRITE,
  Permission.LEADS_ASSIGN,
  Permission.LEADS_REPORTS,
];

/**
 * Code-defined role → permission matrix.
 * SUPER_ADMIN inherits every permission via hasPermission().
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.SUPER_ADMIN]: ALL_PERMISSIONS,
  [Role.ADMIN]: ADMIN_OPS,
  [Role.FLEET_MANAGER]: FLEET_OPS,
  [Role.FINANCE]: [
    Permission.DASHBOARD_READ,
    Permission.SEARCH_READ,
    Permission.CLIENTS_READ,
    Permission.CLIENTS_WRITE,
    Permission.CONTRACTS_READ,
    Permission.CONTRACTS_FINANCE_READ,
    Permission.CONTRACTS_WRITE,
    Permission.FINANCE_READ,
    Permission.FINANCE_WRITE,
    Permission.FLEET_READ,
    Permission.FINES_READ,
    Permission.LICENCES_READ,
    Permission.END_OF_TERM_READ,
    Permission.NOTIFICATIONS_READ,
    Permission.NOTIFICATIONS_WRITE,
  ],
  [Role.SALES]: [
    Permission.DASHBOARD_READ,
    Permission.SEARCH_READ,
    Permission.CLIENTS_READ,
    Permission.CLIENTS_WRITE,
    Permission.FLEET_READ,
    Permission.NOTIFICATIONS_READ,
    Permission.NOTIFICATIONS_WRITE,
    Permission.LEADS_READ,
    Permission.LEADS_WRITE,
  ],
};

export function roleLabel(role: Role): string {
  switch (role) {
    case Role.SUPER_ADMIN:
      return 'Super Admin';
    case Role.ADMIN:
      return 'Manager / Admin';
    case Role.FLEET_MANAGER:
      return 'Fleet / Licensing';
    case Role.SALES:
      return 'Sales';
    case Role.FINANCE:
      return 'Finance';
    default:
      return 'User';
  }
}

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === Role.SUPER_ADMIN) return true;
  const list = ROLE_PERMISSIONS[role];
  if (!list) return false;
  return list.includes(permission);
}

export function hasAllPermissions(
  role: Role,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function permissionsForRole(role: Role): Permission[] {
  if (role === Role.SUPER_ADMIN) return [...ALL_PERMISSIONS];
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}
