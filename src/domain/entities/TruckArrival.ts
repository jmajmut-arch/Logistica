import type { TruckLocation } from '@/types/enums';

export interface TruckArrival {
  id: number;
  plate: string;
  carrier: string | null;
  location: TruckLocation;
  scheduledAt: number | null;
  arrivedAt: number;
  registeredBy: number;
  notes: string | null;
  createdAt: number;
}

export type NewTruckArrival = Omit<TruckArrival, 'id' | 'createdAt'>;
