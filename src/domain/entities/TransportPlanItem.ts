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
  /** Solo se usa en ocurrencias con recurrenceRuleId: cancelar (en vez de borrar) evita que
   * la sincronización regenere la misma semana al ver que quedó "libre". Un item cancelado
   * queda excluido de findAll() — para el resto de la app se ve exactamente como borrado. */
  cancelled: boolean;
  /** El operador marcó este viaje como "no llegó" desde Llegadas — a diferencia de
   * `cancelled`, sigue contando en el total planificado del período como incumplimiento
   * (falla estadística) y sigue apareciendo en el plan y en Llegadas, solo que como
   * cancelado en vez de pendiente por registrar. */
  cancelledByOperator: boolean;
  /** Quién y cuándo lo canceló, para dejar registro de qué operador lo marcó. Nulos si
   * cancelledByOperator es false. */
  cancelledBy: number | null;
  cancelledAt: number | null;
  requiresHeavyCrane: boolean;
  createdBy: number;
  createdAt: number;
}

export type NewTransportPlanItem = Omit<TransportPlanItem, 'id' | 'createdAt'>;
