import type { Role } from '@/types/enums';

export interface Permissions {
  manageSubstances: boolean;
  resolveAlerts: boolean;
  configureRules: boolean;
  performVerifications: boolean;
}

const PERMISSIONS_BY_ROLE: Record<Role, Permissions> = {
  warehouse: {
    manageSubstances: true,
    resolveAlerts: false,
    configureRules: false,
    performVerifications: true,
  },
  supervisor: {
    manageSubstances: true,
    resolveAlerts: true,
    configureRules: false,
    performVerifications: true,
  },
  hse: {
    manageSubstances: true,
    resolveAlerts: true,
    configureRules: true,
    performVerifications: true,
  },
};

export function getPermissions(role: Role): Permissions {
  return PERMISSIONS_BY_ROLE[role];
}
