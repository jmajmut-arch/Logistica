import type { OperationType } from '@/types/enums';

export interface TransportPlanItem {
  id: number;
  operationType: OperationType;
  siteId: number;
  carrierId: number | null;
  scheduledAt: number;
  reference: string | null;
  notes: string | null;
  /** No nulo si esta fecha puntual fue generada por una regla de planificación
   * permanente. Editarla o eliminarla solo afecta esta ocurrencia, nunca la regla. */
  recurrenceRuleId: number | null;
  requiresHeavyCrane: boolean;
  createdBy: number;
  createdAt: number;
}

export type NewTransportPlanItem = Omit<TransportPlanItem, 'id' | 'createdAt'>;
