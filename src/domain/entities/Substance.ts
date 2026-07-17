import type { HazardClass, Unit } from '@/types/enums';

export interface Substance {
  id: number;
  name: string;
  hazardClass: HazardClass;
  quantity: number;
  unit: Unit;
  zoneId: number;
  expirationDate: string; // ISO 8601 (YYYY-MM-DD)
  sdsUri: string | null;
  sdsFileName: string | null;
  createdBy: number;
  createdAt: number;
  updatedAt: number;
}

export type NewSubstance = Omit<Substance, 'id' | 'createdAt' | 'updatedAt'>;
