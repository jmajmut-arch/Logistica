import { differenceInCalendarDays } from 'date-fns';

import type { Zone } from '@/domain/entities/Zone';
import type { AlertSeverity } from '@/types/enums';

// Intervalo máximo entre verificaciones en terreno por zona. Sin verificación previa
// se trata siempre como 'high': una zona nunca inspeccionada es un vacío de control,
// no una simple demora.
export const VERIFICATION_THRESHOLDS = {
  intervalDays: 30,
  highRiskOverdueDays: 15,
} as const;

export interface VerificationFinding {
  zoneId: number;
  daysSinceLastVerification: number | null;
  severity: AlertSeverity;
}

export function checkZoneVerification(
  zoneId: number,
  lastPerformedAt: number | undefined,
  today: Date,
): VerificationFinding | null {
  if (lastPerformedAt === undefined) {
    return { zoneId, daysSinceLastVerification: null, severity: 'high' };
  }

  const daysSinceLastVerification = differenceInCalendarDays(today, new Date(lastPerformedAt));
  if (daysSinceLastVerification <= VERIFICATION_THRESHOLDS.intervalDays) {
    return null;
  }

  const overdueDays = daysSinceLastVerification - VERIFICATION_THRESHOLDS.intervalDays;
  const severity: AlertSeverity =
    overdueDays >= VERIFICATION_THRESHOLDS.highRiskOverdueDays ? 'high' : 'medium';

  return { zoneId, daysSinceLastVerification, severity };
}

export function findVerificationFindings(
  zones: Zone[],
  latestByZone: Map<number, number>,
  today: Date,
): VerificationFinding[] {
  return zones
    .map((zone) => checkZoneVerification(zone.id, latestByZone.get(zone.id), today))
    .filter((finding): finding is VerificationFinding => finding !== null);
}
