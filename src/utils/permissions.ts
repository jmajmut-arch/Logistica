import type { Role } from '@/types/enums';

export interface Permissions {
  managePlan: boolean;
  registerArrivals: boolean;
  manageCatalog: boolean;
}

const PERMISSIONS_BY_ROLE: Record<Role, Permissions> = {
  // El administrador mantiene los catálogos (personas, áreas, empresas). El supervisor
  // carga el plan de transporte semanal. El operador registra las llegadas reales.
  // Separación estricta para dejar trazabilidad clara de quién hizo cada cosa.
  admin: {
    managePlan: false,
    registerArrivals: false,
    manageCatalog: true,
  },
  supervisor: {
    managePlan: true,
    registerArrivals: false,
    manageCatalog: false,
  },
  operator: {
    managePlan: false,
    registerArrivals: true,
    manageCatalog: false,
  },
};

export function getPermissions(role: Role): Permissions {
  return PERMISSIONS_BY_ROLE[role];
}
