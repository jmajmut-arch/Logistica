import type { HazardClass } from '@/types/enums';

export interface Zone {
  id: number;
  name: string;
  code: string;
}

export interface ZoneClassLimit {
  id: number;
  zoneId: number;
  hazardClass: HazardClass;
  maxQuantity: number;
  unit: string;
}
