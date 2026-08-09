import type { PlanItemStatus } from '@/domain/rules/complianceStatus';
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
