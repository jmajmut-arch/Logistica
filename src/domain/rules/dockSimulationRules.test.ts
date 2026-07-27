import {
  computeCycleBreakdown,
  computePhaseFractions,
  computeThroughputPerForkliftPerHour,
  computeTotalThroughputPerHour,
  computeTruckUnloadTimeMin,
  forkliftPositionForProgress,
  pointAlongPath,
} from '@/domain/rules/dockSimulationRules';
import type { DockCycleParams, Point } from '@/domain/entities/DockSimulation';

function makeParams(overrides: Partial<DockCycleParams> = {}): DockCycleParams {
  return {
    palletsPerTruck: 20,
    pickTimeSec: 30,
    distanceM: 100,
    speedLoadedKmh: 6,
    speedEmptyKmh: 8,
    placeTimeSec: 20,
    ...overrides,
  };
}

describe('computeCycleBreakdown', () => {
  it('sums pick, travel, place and return time', () => {
    const breakdown = computeCycleBreakdown(makeParams());

    expect(breakdown.pickTimeMin).toBeCloseTo(0.5);
    expect(breakdown.travelTimeMin).toBeCloseTo(1);
    expect(breakdown.placeTimeMin).toBeCloseTo(1 / 3);
    expect(breakdown.returnTimeMin).toBeCloseTo(0.75);
    expect(breakdown.cycleTimeMin).toBeCloseTo(0.5 + 1 + 1 / 3 + 0.75);
  });

  it('treats zero speed as zero travel time instead of dividing by zero', () => {
    const breakdown = computeCycleBreakdown(makeParams({ speedLoadedKmh: 0, speedEmptyKmh: 0 }));

    expect(breakdown.travelTimeMin).toBe(0);
    expect(breakdown.returnTimeMin).toBe(0);
  });
});

describe('throughput', () => {
  it('computes pallets per hour for one forklift as the inverse of cycle time', () => {
    expect(computeThroughputPerForkliftPerHour(3)).toBeCloseTo(20);
    expect(computeThroughputPerForkliftPerHour(0)).toBe(0);
  });

  it('scales total throughput by the number of forklifts', () => {
    expect(computeTotalThroughputPerHour(3, 4)).toBeCloseTo(80);
    expect(computeTotalThroughputPerHour(3, 0)).toBe(0);
  });
});

describe('computeTruckUnloadTimeMin', () => {
  it('divides total pallet time across the forklift fleet', () => {
    expect(computeTruckUnloadTimeMin(20, 3, 2)).toBeCloseTo(30);
  });

  it('is infinite when there are no forklifts or no pallets', () => {
    expect(computeTruckUnloadTimeMin(20, 3, 0)).toBe(Infinity);
    expect(computeTruckUnloadTimeMin(0, 3, 2)).toBe(Infinity);
  });
});

describe('computePhaseFractions', () => {
  it('splits the cycle into cumulative fractions that end below 1', () => {
    const fractions = computePhaseFractions({
      pickTimeMin: 1,
      travelTimeMin: 2,
      placeTimeMin: 1,
      returnTimeMin: 2,
      cycleTimeMin: 6,
    });

    expect(fractions.pickEnd).toBeCloseTo(1 / 6);
    expect(fractions.travelEnd).toBeCloseTo(3 / 6);
    expect(fractions.placeEnd).toBeCloseTo(4 / 6);
    expect(fractions.placeEnd).toBeLessThan(1);
  });

  it('returns zeros when the cycle has no duration', () => {
    expect(
      computePhaseFractions({
        pickTimeMin: 0,
        travelTimeMin: 0,
        placeTimeMin: 0,
        returnTimeMin: 0,
        cycleTimeMin: 0,
      }),
    ).toEqual({ pickEnd: 0, travelEnd: 0, placeEnd: 0 });
  });
});

describe('pointAlongPath', () => {
  const path: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  it('returns the first point at progress 0 and the last point at progress 1', () => {
    expect(pointAlongPath(0, path)).toEqual({ x: 0, y: 0 });
    expect(pointAlongPath(1, path)).toEqual({ x: 10, y: 10 });
  });

  it('lands exactly on the bend when segments have equal length', () => {
    expect(pointAlongPath(0.5, path)).toEqual({ x: 10, y: 0 });
  });

  it('interpolates within the first segment before the bend', () => {
    expect(pointAlongPath(0.25, path)).toEqual({ x: 5, y: 0 });
  });
});

describe('forkliftPositionForProgress', () => {
  const path: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
  ];
  const fractions = { pickEnd: 0.2, travelEnd: 0.5, placeEnd: 0.7 };

  it('stays at the dock during the picking phase', () => {
    const state = forkliftPositionForProgress(0.1, fractions, path);
    expect(state.phase).toBe('picking');
    expect(state).toMatchObject({ x: 0, y: 0 });
  });

  it('moves from dock to rack during the traveling phase', () => {
    const midTravel = forkliftPositionForProgress(0.35, fractions, path);
    expect(midTravel.phase).toBe('traveling');
    expect(midTravel.x).toBeGreaterThan(0);
    expect(midTravel.x).toBeLessThan(10);
  });

  it('stays at the rack during the placing phase', () => {
    const state = forkliftPositionForProgress(0.6, fractions, path);
    expect(state.phase).toBe('placing');
    expect(state).toMatchObject({ x: 10, y: 0 });
  });

  it('moves back from rack to dock during the returning phase, reversing direction', () => {
    const earlyReturn = forkliftPositionForProgress(0.75, fractions, path);
    const lateReturn = forkliftPositionForProgress(0.95, fractions, path);
    expect(earlyReturn.phase).toBe('returning');
    expect(lateReturn.phase).toBe('returning');
    expect(lateReturn.x).toBeLessThan(earlyReturn.x);
  });

  it('wraps progress values outside [0,1)', () => {
    expect(forkliftPositionForProgress(1.1, fractions, path).phase).toBe('picking');
  });
});
