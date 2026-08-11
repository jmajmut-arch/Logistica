import type { OperationType } from '@/types/enums';

export interface TransportPlanItem {
  id: number;
  operationType: OperationType;
  siteId: number;
  carrierId: number | null;
  scheduledAt: number;
  /** Si es true, scheduledAt solo representa el día (medianoche) y no hay una hora
   * comprometida: la agenda lo muestra como "Sin horario" y nunca cuenta como
   * atrasado/anticipado, solo pendiente hasta que se registre la llegada. */
  hasNoSchedule: boolean;
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
