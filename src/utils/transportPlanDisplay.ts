import type { DisplayStatus, PlanItemStatus } from '@/domain/rules/complianceStatus';
import type { OperationType } from '@/types/enums';

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  carga_subida: 'Carga subida',
  retiro_carga: 'Retiro de carga',
  home_delivery: 'Home delivery',
};

export const PLAN_ITEM_STATUS_LABELS: Record<PlanItemStatus, string> = {
  pending: 'Pendiente',
  on_time: 'A tiempo',
  late: 'Atrasado',
  early: 'Anticipado',
};

export const PLAN_ITEM_STATUS_COLORS: Record<PlanItemStatus, string> = {
  pending: '#6B7280',
  on_time: '#2E7D32',
  late: '#B3261E',
  early: '#0284C7',
};

export const DISPLAY_STATUS_LABELS: Record<DisplayStatus, string> = {
  ...PLAN_ITEM_STATUS_LABELS,
  overdue: 'Fuera de planificación',
};

export const DISPLAY_STATUS_COLORS: Record<DisplayStatus, string> = {
  ...PLAN_ITEM_STATUS_COLORS,
  overdue: '#DC2626',
};

// Estado extendido solo para gráficos/estadísticas del dashboard: además de los estados
// del plan, suma las cargas que llegaron sin estar planificadas ("Viaje no planificado"),
// para que el panorama de tráfico real del sitio no las deje afuera.
export type ExtendedDisplayStatus = DisplayStatus | 'out_of_plan';

export const EXTENDED_STATUS_LABELS: Record<ExtendedDisplayStatus, string> = {
  ...DISPLAY_STATUS_LABELS,
  out_of_plan: 'No planificado',
};

export const EXTENDED_STATUS_COLORS: Record<ExtendedDisplayStatus, string> = {
  ...DISPLAY_STATUS_COLORS,
  out_of_plan: '#a78bfa',
};

// Aviso de que el viaje requiere una grúa especial de alto tonelaje: se muestra en el
// plan, en el registro de llegadas del operador y en el dashboard, para que quien reciba
// el camión sepa de antemano que necesita coordinar ese equipo.
export const HEAVY_CRANE_COLOR = '#f59e0b';
export const HEAVY_CRANE_LABEL = 'Requiere grúa de alto tonelaje (32 t)';
export const HEAVY_CRANE_LABEL_SHORT = 'Grúa 32 t';

/** Color según umbral de % de cumplimiento, para las tarjetas del dashboard. */
export function getComplianceColor(percentage: number | null): string {
  if (percentage === null) {
    return '#6B7280';
  }
  if (percentage >= 90) {
    return '#2E7D32';
  }
  if (percentage >= 70) {
    return '#C77700';
  }
  return '#B3261E';
}
