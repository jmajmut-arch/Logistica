import type { Substance } from '@/domain/entities/Substance';
import type { ZoneClassLimit } from '@/domain/entities/Zone';
import type { AlertSeverity, HazardClass } from '@/types/enums';

// % sobre el límite configurado a partir del cual escala la severidad.
export const CAPACITY_THRESHOLDS = {
  highRiskOverageRatio: 0.25,
  criticalOverageRatio: 0.5,
} as const;

export interface ZoneClassTotal {
  zoneId: number;
  hazardClass: HazardClass;
  totalQuantity: number;
}

export interface CapacityFinding {
  zoneId: number;
  hazardClass: HazardClass;
  totalQuantity: number;
  maxQuantity: number;
  unit: string;
  overageRatio: number;
  severity: AlertSeverity;
}

export function sumQuantityByZoneAndClass(substances: Substance[]): ZoneClassTotal[] {
  const totals = new Map<string, ZoneClassTotal>();

  for (const substance of substances) {
    const key = `${substance.zoneId}:${substance.hazardClass}`;
    const existing = totals.get(key);
    if (existing) {
      existing.totalQuantity += substance.quantity;
    } else {
      totals.set(key, {
        zoneId: substance.zoneId,
        hazardClass: substance.hazardClass,
        totalQuantity: substance.quantity,
      });
    }
  }

  return Array.from(totals.values());
}

export function checkCapacity(
  total: ZoneClassTotal,
  limit: ZoneClassLimit,
): CapacityFinding | null {
  if (total.totalQuantity <= limit.maxQuantity) {
    return null;
  }

  const overageRatio = total.totalQuantity / limit.maxQuantity - 1;
  const severity: AlertSeverity =
    overageRatio >= CAPACITY_THRESHOLDS.criticalOverageRatio
      ? 'critical'
      : overageRatio >= CAPACITY_THRESHOLDS.highRiskOverageRatio
        ? 'high'
        : 'medium';

  return {
    zoneId: total.zoneId,
    hazardClass: total.hazardClass,
    totalQuantity: total.totalQuantity,
    maxQuantity: limit.maxQuantity,
    unit: limit.unit,
    overageRatio,
    severity,
  };
}

export function findCapacityFindings(
  totals: ZoneClassTotal[],
  limits: ZoneClassLimit[],
): CapacityFinding[] {
  const findings: CapacityFinding[] = [];

  for (const total of totals) {
    const limit = limits.find(
      (candidate) =>
        candidate.zoneId === total.zoneId && candidate.hazardClass === total.hazardClass,
    );
    // Sin límite configurado para esa clase/zona no hay nada contra qué validar.
    if (!limit) {
      continue;
    }

    const finding = checkCapacity(total, limit);
    if (finding) {
      findings.push(finding);
    }
  }

  return findings;
}
