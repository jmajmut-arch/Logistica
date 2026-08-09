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
 * % de items "a tiempo" sobre el total planificado del período. Cualquier item sin
 * llegada registrada — esté vencido o todavía no le toque — cuenta como no cumplido
 * todavía, así el % siempre refleja cuánto del plan realmente llegó a tiempo (no solo
 * lo que ya se resolvió). Devuelve null si no hay ningún item planificado.
 */
export function getCompliancePercentage(statuses: DisplayStatus[]): number | null {
  if (statuses.length === 0) {
    return null;
  }
  const onTime = statuses.filter((status) => status === 'on_time').length;
  return Math.round((onTime / statuses.length) * 100);
}

/**
 * Igual que getPlanItemStatus, pero distingue un "pendiente" cuya hora planificada ya
 * pasó ("overdue" — necesita atención ahora) de uno que todavía no toca. Es una capa
 * visual para la agenda; para el % de cumplimiento ambos cuentan igual (no a tiempo).
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
