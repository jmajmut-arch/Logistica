import { combineDayAndBlock, startOfDay, startOfWeek } from '@/utils/timeBlocks';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Cuántas semanas hacia adelante se mantienen materializadas las ocurrencias de una
 * regla permanente. Se vuelve a evaluar cada vez que se abre el plan, así la ventana
 * siempre "rueda" hacia adelante sin necesidad de un job en el servidor. */
export const RECURRING_HORIZON_WEEKS = 12;

/**
 * Fechas concretas (scheduledAt) que deberían existir para una regla "todos los [día]
 * a las [hora]", desde el inicio de esta semana hasta `horizonWeeks` semanas después.
 * No incluye días de esta semana ya totalmente pasados (antes de hoy), para no
 * generar ocurrencias "del pasado" que nunca se planificaron realmente.
 */
export function computeUpcomingScheduledDates(
  dayOfWeek: number,
  blockMinutes: number,
  now: number = Date.now(),
  horizonWeeks: number = RECURRING_HORIZON_WEEKS,
): number[] {
  const currentWeekStart = startOfWeek(now);
  const today = startOfDay(now);
  const dates: number[] = [];
  for (let week = 0; week <= horizonWeeks; week++) {
    const dayStart = currentWeekStart + week * 7 * DAY_MS + dayOfWeek * DAY_MS;
    if (dayStart < today) {
      continue;
    }
    dates.push(combineDayAndBlock(dayStart, blockMinutes));
  }
  return dates;
}
