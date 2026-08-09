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
