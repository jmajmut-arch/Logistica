import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';

export type PlanItemStatus = 'pending' | 'on_time' | 'late' | 'early';

// Margen de tolerancia frente a la hora planificada antes de considerar atraso o anticipo.
const TOLERANCE_MINUTES = 15;

export function getPlanItemStatus(
  planItem: Pick<TransportPlanItem, 'scheduledAt' | 'hasNoSchedule'>,
  arrival: Pick<LoadArrival, 'arrivedAt'> | undefined,
): PlanItemStatus {
  if (!arrival) {
    return 'pending';
  }
  // Sin horario comprometido no hay nada contra qué medir atraso/anticipo: cualquier
  // llegada registrada cumple el plan.
  if (planItem.hasNoSchedule) {
    return 'on_time';
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

export type DisplayStatus = PlanItemStatus | 'overdue' | 'cancelled';

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
 * pasó ("overdue" — necesita atención ahora) de uno que todavía no toca, y un pendiente
 * que el operador marcó como "viaje cancelado" ("cancelled"). Es una capa visual para la
 * agenda; para el % de cumplimiento los tres cuentan igual (no a tiempo) — un cancelado
 * sigue en el total del período, a diferencia de un item con `cancelled` (tombstone de
 * regla permanente), que se excluye por completo antes de llegar acá.
 */
export function getDisplayStatus(
  planItem: Pick<TransportPlanItem, 'scheduledAt' | 'hasNoSchedule'> & {
    cancelledByOperator?: boolean;
  },
  arrival: Pick<LoadArrival, 'arrivedAt'> | undefined,
  now: number = Date.now(),
): DisplayStatus {
  const status = getPlanItemStatus(planItem, arrival);
  if (status === 'pending' && planItem.cancelledByOperator) {
    return 'cancelled';
  }
  if (status === 'pending' && !planItem.hasNoSchedule && planItem.scheduledAt < now) {
    return 'overdue';
  }
  return status;
}
