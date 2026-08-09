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

/** Fecha de hoy en hora local, a las 00:00. */
export function startOfToday(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

/** Combina el inicio de un día (00:00 local) con un bloque horario. */
export function combineDayAndBlock(dayStart: number, blockMinutes: number): number {
  return dayStart + blockMinutes * 60_000;
}
