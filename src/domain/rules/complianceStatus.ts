import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';

export type PlanItemStatus = 'pending' | 'on_time' | 'late' | 'early';

// Margen de tolerancia frente a la hora planificada antes de considerar atraso o anticipo.
const TOLERANCE_MINUTES = 15;

export function getPlanItemStatus(
  planItem: Pick<TransportPlanItem, 'scheduledAt'>,
  arrival: Pick<LoadArrival, 'arrivedAt'> | undefined,
): PlanItemStatus {
  if (!arrival) {
    return 'pending';
  }
  const diffMinutes = (arrival.arrivedAt - planItem.scheduledAt) / 60_000;
  if (diffMinutes > TOLERANCE_MINUTES) {
    return 'late';
  }
  if (diffMinutes < -TOLERANCE_MINUTES) {
    return 'early';
  }
  return 'on_time';
}

/**
 * % de items "a tiempo" sobre los que ya se resolvieron (excluye pendientes, porque
 * todavía no sabemos si van a cumplir). Devuelve null si no hay ninguno resuelto aún.
 */
export function getCompliancePercentage(statuses: PlanItemStatus[]): number | null {
  const decided = statuses.filter((status) => status !== 'pending');
  if (decided.length === 0) {
    return null;
  }
  const onTime = decided.filter((status) => status === 'on_time').length;
  return Math.round((onTime / decided.length) * 100);
}
