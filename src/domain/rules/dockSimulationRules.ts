import type {
  CyclePhaseFractions,
  DockCycleBreakdown,
  DockCycleParams,
  ForkliftPhase,
  ForkliftState,
  Point,
} from '@/domain/entities/DockSimulation';

const MIN_SPAN = 1e-6;

function timeForDistanceMin(distanceM: number, speedKmh: number): number {
  return speedKmh > 0 ? (distanceM / 1000 / speedKmh) * 60 : 0;
}

export function computeCycleBreakdown(params: DockCycleParams): DockCycleBreakdown {
  const pickTimeMin = params.pickTimeSec / 60;
  const travelTimeMin = timeForDistanceMin(params.distanceM, params.speedLoadedKmh);
  const placeTimeMin = params.placeTimeSec / 60;
  const returnTimeMin = timeForDistanceMin(params.distanceM, params.speedEmptyKmh);

  return {
    pickTimeMin,
    travelTimeMin,
    placeTimeMin,
    returnTimeMin,
    cycleTimeMin: pickTimeMin + travelTimeMin + placeTimeMin + returnTimeMin,
  };
}

export function computeThroughputPerForkliftPerHour(cycleTimeMin: number): number {
  return cycleTimeMin > 0 ? 60 / cycleTimeMin : 0;
}

export function computeTotalThroughputPerHour(cycleTimeMin: number, numForklifts: number): number {
  return numForklifts > 0 ? numForklifts * computeThroughputPerForkliftPerHour(cycleTimeMin) : 0;
}

export function computeTruckUnloadTimeMin(
  palletsPerTruck: number,
  cycleTimeMin: number,
  numForklifts: number,
): number {
  if (numForklifts <= 0 || palletsPerTruck <= 0) {
    return Infinity;
  }
  return (palletsPerTruck * cycleTimeMin) / numForklifts;
}

export function computePhaseFractions(breakdown: DockCycleBreakdown): CyclePhaseFractions {
  if (breakdown.cycleTimeMin <= 0) {
    return { pickEnd: 0, travelEnd: 0, placeEnd: 0 };
  }
  const pickEnd = breakdown.pickTimeMin / breakdown.cycleTimeMin;
  const travelEnd = pickEnd + breakdown.travelTimeMin / breakdown.cycleTimeMin;
  const placeEnd = travelEnd + breakdown.placeTimeMin / breakdown.cycleTimeMin;
  return { pickEnd, travelEnd, placeEnd };
}

export function pointAlongPath(progress: number, points: Point[]): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return points[0];
  }

  const t = Math.min(Math.max(progress, 0), 1);
  const segmentLengths = points.slice(1).map((point, index) => {
    const previous = points[index];
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);

  if (totalLength <= 0) {
    return points[0];
  }

  let distanceIntoPath = t * totalLength;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    if (distanceIntoPath <= segmentLength || index === segmentLengths.length - 1) {
      const segmentT = segmentLength > 0 ? Math.min(distanceIntoPath / segmentLength, 1) : 0;
      const start = points[index];
      const end = points[index + 1];
      return {
        x: start.x + (end.x - start.x) * segmentT,
        y: start.y + (end.y - start.y) * segmentT,
      };
    }
    distanceIntoPath -= segmentLength;
  }

  return points[points.length - 1];
}

export function forkliftPositionForProgress(
  progress: number,
  fractions: CyclePhaseFractions,
  points: Point[],
): ForkliftState {
  const p = ((progress % 1) + 1) % 1;
  const { pickEnd, travelEnd, placeEnd } = fractions;
  const dockPoint = points[0] ?? { x: 0, y: 0 };
  const rackPoint = points[points.length - 1] ?? { x: 0, y: 0 };

  let phase: ForkliftPhase;
  let phaseProgress: number;
  let position: Point;

  if (p < pickEnd) {
    phase = 'picking';
    phaseProgress = pickEnd > 0 ? p / pickEnd : 0;
    position = dockPoint;
  } else if (p < travelEnd) {
    phase = 'traveling';
    phaseProgress = p - pickEnd < 0 ? 0 : (p - pickEnd) / Math.max(travelEnd - pickEnd, MIN_SPAN);
    position = pointAlongPath(phaseProgress, points);
  } else if (p < placeEnd) {
    phase = 'placing';
    phaseProgress = (p - travelEnd) / Math.max(placeEnd - travelEnd, MIN_SPAN);
    position = rackPoint;
  } else {
    phase = 'returning';
    phaseProgress = (p - placeEnd) / Math.max(1 - placeEnd, MIN_SPAN);
    position = pointAlongPath(1 - phaseProgress, points);
  }

  return { ...position, phase, phaseProgress: Math.min(Math.max(phaseProgress, 0), 1) };
}
