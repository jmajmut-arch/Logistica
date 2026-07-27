import { simulateLoad, sumCargoItems } from '@/domain/rules/loadSimulatorRules';
import type { CargoItem } from '@/domain/entities/LoadSimulation';

function makeItem(overrides: Partial<CargoItem> = {}): CargoItem {
  return {
    id: '1',
    name: 'Caja genérica',
    unitWeightKg: 10,
    unitVolumeM3: 0.2,
    quantity: 5,
    ...overrides,
  };
}

describe('sumCargoItems', () => {
  it('sums weight, volume and item count across items', () => {
    const items = [
      makeItem({ unitWeightKg: 10, unitVolumeM3: 0.2, quantity: 5 }),
      makeItem({ id: '2', unitWeightKg: 3, unitVolumeM3: 0.05, quantity: 20 }),
    ];

    expect(sumCargoItems(items)).toEqual({
      totalWeightKg: 110,
      totalVolumeM3: 2,
      itemCount: 25,
    });
  });

  it('returns zeros for an empty list', () => {
    expect(sumCargoItems([])).toEqual({ totalWeightKg: 0, totalVolumeM3: 0, itemCount: 0 });
  });
});

describe('simulateLoad', () => {
  it('reports utilization under capacity as not over and not near limit', () => {
    const items = [makeItem({ unitWeightKg: 10, unitVolumeM3: 0.1, quantity: 10 })];
    const result = simulateLoad(items, { maxWeightKg: 1000, maxVolumeM3: 10 });

    expect(result.totalWeightKg).toBe(100);
    expect(result.weightUtilization).toBeCloseTo(0.1);
    expect(result.overWeight).toBe(false);
    expect(result.weightNearLimit).toBe(false);
  });

  it('flags near-limit at or above the warning threshold', () => {
    const items = [makeItem({ unitWeightKg: 900, unitVolumeM3: 1, quantity: 1 })];
    const result = simulateLoad(items, { maxWeightKg: 1000, maxVolumeM3: 10 });

    expect(result.weightUtilization).toBeCloseTo(0.9);
    expect(result.weightNearLimit).toBe(true);
    expect(result.overWeight).toBe(false);
  });

  it('flags overWeight and overVolume once totals exceed capacity', () => {
    const items = [makeItem({ unitWeightKg: 600, unitVolumeM3: 6, quantity: 2 })];
    const result = simulateLoad(items, { maxWeightKg: 1000, maxVolumeM3: 10 });

    expect(result.totalWeightKg).toBe(1200);
    expect(result.totalVolumeM3).toBe(12);
    expect(result.overWeight).toBe(true);
    expect(result.overVolume).toBe(true);
    expect(result.weightNearLimit).toBe(false);
  });

  it('treats zero capacity as zero utilization instead of dividing by zero', () => {
    const result = simulateLoad([], { maxWeightKg: 0, maxVolumeM3: 0 });

    expect(result.weightUtilization).toBe(0);
    expect(result.volumeUtilization).toBe(0);
    expect(result.overWeight).toBe(false);
  });
});
