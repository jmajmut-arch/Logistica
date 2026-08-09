import type { Role } from '@/types/enums';

export interface Permissions {
  managePlan: boolean;
  registerArrivals: boolean;
}

const PERMISSIONS_BY_ROLE: Record<Role, Permissions> = {
  // El supervisor carga el plan de transporte semanal; el operador registra las llegadas
  // reales. Separación estricta para dejar trazabilidad clara de quién hizo cada cosa.
  supervisor: {
    managePlan: true,
    registerArrivals: false,
  },
  operator: {
    managePlan: false,
    registerArrivals: true,
  },
};

export function getPermissions(role: Role): Permissions {
  return PERMISSIONS_BY_ROLE[role];
}
