import type { OperationType } from '@/types/enums';

export interface RecurringPlanRule {
  id: number;
  operationType: OperationType;
  siteId: number;
  carrierId: number | null;
  /** 0 = lunes ... 6 = domingo (mismo orden que WEEKDAY_LABELS del dashboard). */
  dayOfWeek: number;
  /** Minutos desde medianoche, en bloques de 30 (igual que TIME_BLOCKS). */
  blockMinutes: number;
  requiresHeavyCrane: boolean;
  reference: string | null;
  notes: string | null;
  active: boolean;
  createdBy: number;
  createdAt: number;
}

export type NewRecurringPlanRule = Omit<RecurringPlanRule, 'id' | 'createdAt'>;
