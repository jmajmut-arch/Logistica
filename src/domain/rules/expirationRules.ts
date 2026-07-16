import { differenceInCalendarDays, parseISO } from 'date-fns';

import type { Substance } from '@/domain/entities/Substance';
import type { AlertSeverity } from '@/types/enums';

// Umbrales de negocio para escalar severidad de vencimientos. Vencida siempre es
// 'critical': una sustancia peligrosa vencida es un riesgo activo, no una advertencia.
export const EXPIRATION_THRESHOLDS = {
  highRiskDays: 15,
  mediumRiskDays: 30,
} as const;

export interface ExpirationFinding {
  substance: Substance;
  daysUntilExpiration: number;
  severity: AlertSeverity;
}

export function checkExpiration(substance: Substance, today: Date): ExpirationFinding | null {
  const daysUntilExpiration = differenceInCalendarDays(parseISO(substance.expirationDate), today);

  if (daysUntilExpiration < 0) {
    return { substance, daysUntilExpiration, severity: 'critical' };
  }
  if (daysUntilExpiration <= EXPIRATION_THRESHOLDS.highRiskDays) {
    return { substance, daysUntilExpiration, severity: 'high' };
  }
  if (daysUntilExpiration <= EXPIRATION_THRESHOLDS.mediumRiskDays) {
    return { substance, daysUntilExpiration, severity: 'medium' };
  }
  return null;
}

export function findExpirationFindings(substances: Substance[], today: Date): ExpirationFinding[] {
  return substances
    .map((substance) => checkExpiration(substance, today))
    .filter((finding): finding is ExpirationFinding => finding !== null);
}
