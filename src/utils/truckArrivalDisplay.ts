import type { TruckArrivalStatus } from '@/domain/rules/truckArrivalStatus';
import type { TruckLocation } from '@/types/enums';

export const TRUCK_LOCATION_LABELS: Record<TruckLocation, string> = {
  bodega: 'Bodega',
  patio: 'Patio',
};

export const TRUCK_STATUS_LABELS: Record<TruckArrivalStatus, string> = {
  on_time: 'A tiempo',
  late: 'Atrasado',
  early: 'Anticipado',
  unscheduled: 'Sin planificar',
};

export const TRUCK_STATUS_COLORS: Record<TruckArrivalStatus, string> = {
  on_time: '#2E7D32',
  late: '#B3261E',
  early: '#0284C7',
  unscheduled: '#6B7280',
};
