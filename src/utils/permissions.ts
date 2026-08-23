import type { Role } from '@/types/enums';

export interface Permissions {
  managePlan: boolean;
  registerArrivals: boolean;
  manageCatalog: boolean;
  manageDispatchIssues: boolean;
}

const PERMISSIONS_BY_ROLE: Record<Role, Permissions> = {
  // El planificador (rol "admin") mantiene los catálogos (personas, áreas, empresas) y
  // todo el plan semanal, tanto de transporte (carga subida/retiro) como de home
  // delivery. El supervisor ya no carga plan, pero es quien levanta y regulariza las
  // guías de despacho con problemas — su responsabilidad operativa dentro del dashboard.
  // El operador registra las llegadas reales. Separación estricta para dejar
  // trazabilidad clara de quién hizo cada cosa.
  admin: {
    managePlan: true,
    registerArrivals: false,
    manageCatalog: true,
    manageDispatchIssues: false,
  },
  supervisor: {
    managePlan: false,
    registerArrivals: false,
    manageCatalog: false,
    manageDispatchIssues: true,
  },
  operator: {
    managePlan: false,
    registerArrivals: true,
    manageCatalog: false,
    manageDispatchIssues: false,
  },
};

export function getPermissions(role: Role): Permissions {
  return PERMISSIONS_BY_ROLE[role];
}
