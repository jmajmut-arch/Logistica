import type { LoadCapacityProfile } from '@/domain/entities/LoadSimulation';

export const VEHICLE_PROFILES: LoadCapacityProfile[] = [
  { id: 'van', label: 'Furgón (1.5 t)', category: 'vehicle', maxWeightKg: 1500, maxVolumeM3: 8 },
  {
    id: 'truck_34',
    label: 'Camión 3/4 (4 t)',
    category: 'vehicle',
    maxWeightKg: 4000,
    maxVolumeM3: 20,
  },
  {
    id: 'truck_rigid_2ejes',
    label: 'Camión rígido 2 ejes (10 t)',
    category: 'vehicle',
    maxWeightKg: 10000,
    maxVolumeM3: 45,
  },
  {
    id: 'semitrailer_3ejes',
    label: 'Semirremolque 3 ejes (28 t)',
    category: 'vehicle',
    maxWeightKg: 28000,
    maxVolumeM3: 90,
  },
  {
    id: 'container_20',
    label: "Contenedor 20' (28 t)",
    category: 'vehicle',
    maxWeightKg: 28000,
    maxVolumeM3: 33,
  },
  {
    id: 'container_40',
    label: "Contenedor 40' (26.5 t)",
    category: 'vehicle',
    maxWeightKg: 26500,
    maxVolumeM3: 67,
  },
];

export const ZONE_PROFILES: LoadCapacityProfile[] = [
  {
    id: 'zone_small',
    label: 'Bodega pequeña (50 t)',
    category: 'zone',
    maxWeightKg: 50000,
    maxVolumeM3: 300,
  },
  {
    id: 'zone_medium',
    label: 'Bodega mediana (150 t)',
    category: 'zone',
    maxWeightKg: 150000,
    maxVolumeM3: 900,
  },
  {
    id: 'zone_large',
    label: 'Bodega grande (400 t)',
    category: 'zone',
    maxWeightKg: 400000,
    maxVolumeM3: 2400,
  },
];

export const CUSTOM_PROFILE_ID = 'custom';

export function profilesForCategory(category: 'vehicle' | 'zone'): LoadCapacityProfile[] {
  return category === 'vehicle' ? VEHICLE_PROFILES : ZONE_PROFILES;
}
