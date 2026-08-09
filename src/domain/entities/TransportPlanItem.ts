import type { OperationType } from '@/types/enums';

export interface TransportPlanItem {
  id: number;
  operationType: OperationType;
  scheduledAt: number;
  origin: string | null;
  destination: string | null;
  carrier: string | null;
  reference: string | null;
  notes: string | null;
  createdBy: number;
  createdAt: number;
}

export type NewTransportPlanItem = Omit<TransportPlanItem, 'id' | 'createdAt'>;
