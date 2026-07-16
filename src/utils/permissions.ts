import type { Role } from '@/types/enums';

export interface Permissions {
  manageSubstances: boolean;
  resolveAlerts: boolean;
  configureRules: boolean;
}

const PERMISSIONS_BY_ROLE: Record<Role, Permissions> = {
  warehouse: {
    manageSubstances: true,
    resolveAlerts: false,
    configureRules: false,
  },
  supervisor: {
    manageSubstances: true,
    resolveAlerts: true,
    configureRules: false,
  },
  hse: {
    manageSubstances: true,
    resolveAlerts: true,
    configureRules: true,
  },
};

export function getPermissions(role: Role): Permissions {
  return PERMISSIONS_BY_ROLE[role];
}
