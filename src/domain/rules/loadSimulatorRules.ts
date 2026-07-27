import type { CargoItem, LoadCapacityProfile } from '@/domain/entities/LoadSimulation';

// % sobre la capacidad a partir del cual se muestra advertencia antes de llegar al límite.
export const LOAD_THRESHOLDS = {
  warningRatio: 0.85,
} as const;

export interface LoadTotals {
  totalWeightKg: number;
  totalVolumeM3: number;
  itemCount: number;
}

export interface LoadSimulationResult extends LoadTotals {
  maxWeightKg: number;
  maxVolumeM3: number;
  weightUtilization: number;
  volumeUtilization: number;
  overWeight: boolean;
  overVolume: boolean;
  weightNearLimit: boolean;
  volumeNearLimit: boolean;
}

export function sumCargoItems(items: CargoItem[]): LoadTotals {
  return items.reduce<LoadTotals>(
    (acc, item) => ({
      totalWeightKg: acc.totalWeightKg + item.unitWeightKg * item.quantity,
      totalVolumeM3: acc.totalVolumeM3 + item.unitVolumeM3 * item.quantity,
      itemCount: acc.itemCount + item.quantity,
    }),
    { totalWeightKg: 0, totalVolumeM3: 0, itemCount: 0 },
  );
}

function utilization(used: number, max: number): number {
  return max > 0 ? used / max : 0;
}

export function simulateLoad(
  items: CargoItem[],
  capacity: Pick<LoadCapacityProfile, 'maxWeightKg' | 'maxVolumeM3'>,
): LoadSimulationResult {
  const totals = sumCargoItems(items);
  const weightUtilization = utilization(totals.totalWeightKg, capacity.maxWeightKg);
  const volumeUtilization = utilization(totals.totalVolumeM3, capacity.maxVolumeM3);

  return {
    ...totals,
    maxWeightKg: capacity.maxWeightKg,
    maxVolumeM3: capacity.maxVolumeM3,
    weightUtilization,
    volumeUtilization,
    overWeight: weightUtilization > 1,
    overVolume: volumeUtilization > 1,
    weightNearLimit: weightUtilization >= LOAD_THRESHOLDS.warningRatio && weightUtilization <= 1,
    volumeNearLimit: volumeUtilization >= LOAD_THRESHOLDS.warningRatio && volumeUtilization <= 1,
  };
}
