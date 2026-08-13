import type { DisplayStatus } from '@/domain/rules/complianceStatus';

export function countByStatus(statuses: DisplayStatus[]): Map<DisplayStatus, number> {
  const counts = new Map<DisplayStatus, number>();
  for (const status of statuses) {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return counts;
}

/** Cuenta las cargas fuera de plan como incumplimiento adicional del período: no tienen
 * horario contra el cual medirse, pero sí bajan el % porque el plan no las anticipó. */
export function combinedCompliance(
  planStatuses: DisplayStatus[],
  unplannedCount: number,
): number | null {
  const total = planStatuses.length + unplannedCount;
  if (total === 0) {
    return null;
  }
  const onTime = planStatuses.filter((status) => status === 'on_time').length;
  return Math.round((onTime / total) * 100);
}

/** % de items planificados a los que efectivamente llegó un camión, sin importar si fue a
 * tiempo, atrasado o anticipado — mide si el camión llegó según lo planificado. */
export function arrivalCompliance(planStatuses: DisplayStatus[]): number | null {
  if (planStatuses.length === 0) {
    return null;
  }
  const arrived = planStatuses.filter(
    (status) => status === 'on_time' || status === 'late' || status === 'early',
  ).length;
  return Math.round((arrived / planStatuses.length) * 100);
}

export interface AdherenceEntry {
  status: DisplayStatus;
  hasNoSchedule: boolean;
}

/** % de los camiones que sí llegaron y lo hicieron dentro del horario planificado — mide
 * adherencia horaria solo entre los que llegaron (si nunca llegó, ya lo penaliza
 * arrivalCompliance, no esta métrica). Un item "sin horario" siempre cuenta como
 * `on_time` en getPlanItemStatus (no hay hora contra la cual medir atraso/anticipo), pero
 * para esta métrica específica de puntualidad no tiene sentido contarlo como "a tiempo" —
 * cae en la categoría de 0% adherencia, aunque sigue sumando al total de llegados. */
export function scheduleAdherence(entries: AdherenceEntry[]): number | null {
  const arrived = entries.filter(
    (entry) => entry.status === 'on_time' || entry.status === 'late' || entry.status === 'early',
  );
  if (arrived.length === 0) {
    return null;
  }
  const onTime = arrived.filter((entry) => entry.status === 'on_time' && !entry.hasNoSchedule).length;
  return Math.round((onTime / arrived.length) * 100);
}

/** Viajes con llegada real registrada — ejecutados. No es "total - pendientes": un viaje
 * cancelado por el operador tampoco es pendiente, pero tampoco se ejecutó; restar solo lo
 * pendiente del total dejaba un cancelado contado como ejecutado. */
export function executedCount(counts: Map<DisplayStatus, number>): number {
  return (counts.get('on_time') ?? 0) + (counts.get('late') ?? 0) + (counts.get('early') ?? 0);
}

export function pendingCount(counts: Map<DisplayStatus, number>): number {
  return (counts.get('pending') ?? 0) + (counts.get('overdue') ?? 0);
}

export function cancelledCount(counts: Map<DisplayStatus, number>): number {
  return counts.get('cancelled') ?? 0;
}
