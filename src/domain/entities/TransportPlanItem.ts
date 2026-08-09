import type { OperationType } from '@/types/enums';

export interface TransportPlanItem {
  id: number;
  operationType: OperationType;
  siteId: number;
  carrierId: number | null;
  scheduledAt: number;
  reference: string | null;
  notes: string | null;
  createdBy: number;
  createdAt: number;
}

export type NewTransportPlanItem = Omit<TransportPlanItem, 'id' | 'createdAt'>;
