import type { Role } from '@/types/enums';

export interface Permissions {
  manageSubstances: boolean;
  resolveAlerts: boolean;
  configureRules: boolean;
  performVerifications: boolean;
  registerTruckArrivals: boolean;
}

const PERMISSIONS_BY_ROLE: Record<Role, Permissions> = {
  warehouse: {
    manageSubstances: true,
    resolveAlerts: false,
    configureRules: false,
    performVerifications: true,
    registerTruckArrivals: true,
  },
  // El rol HSE se fusionó con Supervisor: supervisor concentra todos los permisos.
  supervisor: {
    manageSubstances: true,
    resolveAlerts: true,
    configureRules: true,
    performVerifications: true,
    registerTruckArrivals: true,
  },
};

export function getPermissions(role: Role): Permissions {
  return PERMISSIONS_BY_ROLE[role];
}
