import type { TruckArrival } from '@/domain/entities/TruckArrival';

export type TruckArrivalStatus = 'on_time' | 'late' | 'early' | 'unscheduled';

// Margen de tolerancia frente a la hora planificada antes de considerar atraso o anticipo.
const TOLERANCE_MINUTES = 15;

export function getTruckArrivalStatus(
  arrival: Pick<TruckArrival, 'scheduledAt' | 'arrivedAt'>,
): TruckArrivalStatus {
  if (arrival.scheduledAt === null) {
    return 'unscheduled';
  }
  const diffMinutes = (arrival.arrivedAt - arrival.scheduledAt) / 60_000;
  if (diffMinutes > TOLERANCE_MINUTES) {
    return 'late';
  }
  if (diffMinutes < -TOLERANCE_MINUTES) {
    return 'early';
  }
  return 'on_time';
}
