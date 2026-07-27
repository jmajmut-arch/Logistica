export interface CargoItem {
  id: string;
  name: string;
  unitWeightKg: number;
  unitVolumeM3: number;
  quantity: number;
}

export type LoadCapacityCategory = 'vehicle' | 'zone';

export interface LoadCapacityProfile {
  id: string;
  label: string;
  category: LoadCapacityCategory;
  maxWeightKg: number;
  maxVolumeM3: number;
}
