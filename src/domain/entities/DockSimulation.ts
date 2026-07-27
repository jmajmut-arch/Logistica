export interface DockCycleParams {
  palletsPerTruck: number;
  pickTimeSec: number;
  distanceM: number;
  speedLoadedKmh: number;
  speedEmptyKmh: number;
  placeTimeSec: number;
}

export interface DockCycleBreakdown {
  pickTimeMin: number;
  travelTimeMin: number;
  placeTimeMin: number;
  returnTimeMin: number;
  cycleTimeMin: number;
}

export interface Point {
  x: number;
  y: number;
}

export type ForkliftPhase = 'picking' | 'traveling' | 'placing' | 'returning';

export interface CyclePhaseFractions {
  pickEnd: number;
  travelEnd: number;
  placeEnd: number;
}

export interface ForkliftState extends Point {
  phase: ForkliftPhase;
  phaseProgress: number;
}
