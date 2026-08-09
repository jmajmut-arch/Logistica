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

export type DisplayStatus = PlanItemStatus | 'overdue';

/**
 * % de items "a tiempo" sobre los que ya deberían estar resueltos. Excluye solo los
 * "pending" cuya hora todavía no llega (no podemos juzgarlos aún) — pero un "overdue"
 * (la hora ya pasó y nunca se registró la llegada) sí cuenta, y cuenta en contra, porque
 * es un incumplimiento real. Devuelve null si no hay ningún item que ya debería resolverse.
 */
export function getCompliancePercentage(statuses: DisplayStatus[]): number | null {
  const decided = statuses.filter((status) => status !== 'pending');
  if (decided.length === 0) {
    return null;
  }
  const onTime = decided.filter((status) => status === 'on_time').length;
  return Math.round((onTime / decided.length) * 100);
}

/**
 * Igual que getPlanItemStatus, pero distingue un "pendiente" cuya hora planificada ya
 * pasó ("overdue" — necesita atención ahora, y ya cuenta como incumplimiento en el %) de
 * uno que todavía no toca (sigue sin contar, porque no hay nada que juzgar todavía).
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
