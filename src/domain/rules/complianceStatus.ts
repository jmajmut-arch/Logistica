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

export type DisplayStatus = PlanItemStatus | 'overdue';

/**
 * Igual que getPlanItemStatus, pero distingue un "pendiente" cuya hora planificada ya
 * pasó ("overdue" — necesita atención ahora) de uno que todavía no toca. Es una capa
 * puramente visual: no afecta el cálculo de % de cumplimiento, que sigue tratando ambos
 * casos como no resueltos todavía.
 */
export function getDisplayStatus(
  planItem: Pick<TransportPlanItem, 'scheduledAt'>,
  arrival: Pick<LoadArrival, 'arrivedAt'> | undefined,
  now: number = Date.now(),
): DisplayStatus {
  const status = getPlanItemStatus(planItem, arrival);
  if (status === 'pending' && planItem.scheduledAt < now) {
    return 'overdue';
  }
  return status;
}
