import type { DisplayStatus, PlanItemStatus } from '@/domain/rules/complianceStatus';
import type { OperationType, OperatorScope } from '@/types/enums';

export const OPERATION_TYPE_LABELS: Record<OperationType, string> = {
  carga_subida: 'Carga subida',
  retiro_carga: 'Retiro de carga',
  home_delivery: 'Home delivery',
};

// Color de identidad por tipo de operación: distingue de un vistazo el listado del plan
// semanal (barra de acento por fila), sin superponerse con los colores de estado de
// cumplimiento (verde/rojo/azul) usados en el dashboard.
export const OPERATION_TYPE_COLORS: Record<OperationType, string> = {
  carga_subida: '#38bdf8',
  retiro_carga: '#fb923c',
  home_delivery: '#a78bfa',
};

export const OPERATION_TYPE_ICONS: Record<OperationType, string> = {
  carga_subida: 'arrow-up-bold-box-outline',
  retiro_carga: 'arrow-down-bold-box-outline',
  home_delivery: 'home-city-outline',
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
  // Antes era un rojo casi idéntico al de "late" (#B3261E), lo que los confundía en el
  // dashboard — se usa un naranjo para distinguirlos de un vistazo.
  overdue: '#EA580C',
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

// En plan semanal (transporte) casi no llegan camiones fuera de plan — lo que sí pasa es
// que un viaje planificado se cancela, así que ahí "No planificado" se muestra como "Viaje
// cancelado". Home delivery mantiene el texto original.
export function getUnplannedLabel(scope: OperatorScope | null): string {
  return scope === 'plan_transporte' ? 'Viaje cancelado' : EXTENDED_STATUS_LABELS.out_of_plan;
}

/** Forma adjetiva/plural de getUnplannedLabel, para frases como "3 no planificados". */
export function getUnplannedCountLabel(scope: OperatorScope | null): string {
  return scope === 'plan_transporte' ? 'cancelados' : 'no planificados';
}

export function getExtendedStatusLabel(
  status: ExtendedDisplayStatus,
  scope: OperatorScope | null,
): string {
  return status === 'out_of_plan' ? getUnplannedLabel(scope) : EXTENDED_STATUS_LABELS[status];
}

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
