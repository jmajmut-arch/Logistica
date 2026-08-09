const BLOCK_MINUTES = 30;
const MINUTES_PER_DAY = 24 * 60;

export interface TimeBlock {
  /** Minutos desde medianoche (0, 30, 60, ...). */
  minutes: number;
  label: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatBlock(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** Las 48 franjas de 30 minutos del día, de 00:00 a 23:30. */
export const TIME_BLOCKS: TimeBlock[] = Array.from(
  { length: MINUTES_PER_DAY / BLOCK_MINUTES },
  (_, index) => {
    const minutes = index * BLOCK_MINUTES;
    return { minutes, label: formatBlock(minutes) };
  },
);

/** Bloque de 30 minutos al que pertenece un timestamp, en minutos desde medianoche (hora local). */
export function blockMinutesOf(timestamp: number): number {
  const date = new Date(timestamp);
  const minutesSinceMidnight = date.getHours() * 60 + date.getMinutes();
  return Math.floor(minutesSinceMidnight / BLOCK_MINUTES) * BLOCK_MINUTES;
}

/** Inicio del día (00:00 hora local) que contiene `reference` (por defecto hoy). */
export function startOfDay(reference: number = Date.now()): number {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Fecha de hoy en hora local, a las 00:00. */
export function startOfToday(): number {
  return startOfDay();
}

/** Combina el inicio de un día (00:00 local) con un bloque horario. */
export function combineDayAndBlock(dayStart: number, blockMinutes: number): number {
  return dayStart + blockMinutes * 60_000;
}

/** Lunes de la semana que contiene `reference` (por defecto hoy), a las 00:00 hora local. */
export function startOfWeek(reference: number = Date.now()): number {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 = domingo, 1 = lunes, ...
  const daysSinceMonday = (day + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return date.getTime();
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Número de semana del año (1-52/53) para `timestamp`, contando semanas de lunes a
 * domingo desde el 1 de enero. Es una numeración simple (no ISO-8601 estricta) — suficiente
 * para identificar "la semana X" en la planificación sin modelar semanas como entidad.
 */
export function getWeekNumber(timestamp: number): number {
  const weekStart = startOfWeek(timestamp);
  const year = new Date(timestamp).getFullYear();
  const firstWeekStart = startOfWeek(new Date(year, 0, 1).getTime());
  return Math.round((weekStart - firstWeekStart) / WEEK_MS) + 1;
}
