/**
 * Frontend mirror of apps/api/src/auth/permissions.ts.
 * UI gating only — API PermissionsGuard is authoritative.
 */

export const Permission = {
  DASHBOARD_READ: 'DASHBOARD_READ',
  SEARCH_READ: 'SEARCH_READ',

  CLIENTS_READ: 'CLIENTS_READ',
  CLIENTS_WRITE: 'CLIENTS_WRITE',
  CLIENTS_DELETE: 'CLIENTS_DELETE',

  CONTRACTS_READ: 'CONTRACTS_READ',
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

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FLEET_MANAGER'
  | 'SALES'
  | 'FINANCE';

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

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ADMIN_OPS,
  FLEET_MANAGER: FLEET_OPS,
  FINANCE: [
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
  SALES: [
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

export function roleLabel(role: Role | string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN':
      return 'Manager / Admin';
    case 'FLEET_MANAGER':
      return 'Fleet / Licensing';
    case 'SALES':
      return 'Sales';
    case 'FINANCE':
      return 'Finance';
    default:
      return 'User';
  }
}

export function hasPermission(
  role: Role | string,
  permission: Permission,
): boolean {
  if (role === 'SUPER_ADMIN') return true;
  const list = ROLE_PERMISSIONS[role as Role];
  if (!list) return false;
  return list.includes(permission);
}

export function hasAllPermissions(
  role: Role | string,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function permissionsForRole(role: Role | string): Permission[] {
  if (role === 'SUPER_ADMIN') return [...ALL_PERMISSIONS];
  return [...(ROLE_PERMISSIONS[role as Role] ?? [])];
}

export function isAdminRole(role: Role | string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export type NavLinkDef = {
  href: string;
  label: string;
  permission: Permission | null;
};

/** Ops navigation — null permission = visible to any authenticated staff. */
export const OPS_NAV_LINKS: NavLinkDef[] = [
  { href: '/', label: 'Overview', permission: Permission.DASHBOARD_READ },
  { href: '/fleet', label: 'Master Fleet', permission: Permission.FLEET_READ },
  { href: '/map', label: 'Live Map', permission: Permission.TELEMATICS_READ },
  { href: '/clients', label: 'Clients', permission: Permission.CLIENTS_READ },
  { href: '/leads', label: 'Leads', permission: Permission.LEADS_READ },
  {
    href: '/contracts',
    label: 'Contracts',
    permission: Permission.CONTRACTS_READ,
  },
  {
    href: '/pipeline',
    label: 'End-of-term',
    permission: Permission.END_OF_TERM_READ,
  },
  { href: '/fines', label: 'Fines', permission: Permission.FINES_READ },
  {
    href: '/licences',
    label: 'Licences',
    /** WRITE so Finance (READ-only) does not get primary nav */
    permission: Permission.LICENCES_WRITE,
  },
  {
    href: '/profitability',
    label: 'Profitability',
    permission: Permission.FINANCE_READ,
  },
  {
    href: '/notifications',
    label: 'Alerts',
    permission: Permission.NOTIFICATIONS_READ,
  },
  {
    href: '/automation',
    label: 'Automation',
    permission: Permission.AUTOMATION_READ,
  },
];

export const DEMO_NAV_LINKS: NavLinkDef[] = [
  { href: '/website', label: 'Website demo', permission: null },
];

export function navLinksForRole(role: Role | string): NavLinkDef[] {
  return [...OPS_NAV_LINKS, ...DEMO_NAV_LINKS].filter(
    (link) => !link.permission || hasPermission(role, link.permission),
  );
}

/** Longest-prefix match for dashboard route protection. */
const ROUTE_GUARDS: Array<{ prefix: string; permission: Permission }> = [
  { prefix: '/profitability', permission: Permission.FINANCE_READ },
  { prefix: '/automation', permission: Permission.AUTOMATION_READ },
  { prefix: '/licences', permission: Permission.LICENCES_READ },
  { prefix: '/leads/insights', permission: Permission.LEADS_REPORTS },
  { prefix: '/leads', permission: Permission.LEADS_READ },
  { prefix: '/contracts', permission: Permission.CONTRACTS_READ },
  { prefix: '/pipeline', permission: Permission.END_OF_TERM_READ },
  { prefix: '/fines', permission: Permission.FINES_READ },
  { prefix: '/notifications', permission: Permission.NOTIFICATIONS_READ },
  { prefix: '/clients', permission: Permission.CLIENTS_READ },
  { prefix: '/fleet', permission: Permission.FLEET_READ },
  { prefix: '/map', permission: Permission.TELEMATICS_READ },
];

export function requiredPermissionForPath(
  pathname: string,
): Permission | null {
  const sorted = [...ROUTE_GUARDS].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );
  for (const rule of sorted) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.permission;
    }
  }
  if (pathname === '/' || pathname === '') {
    return Permission.DASHBOARD_READ;
  }
  return null;
}

export function canAccessPath(role: Role | string, pathname: string): boolean {
  const required = requiredPermissionForPath(pathname);
  if (!required) return true;
  return hasPermission(role, required);
}
