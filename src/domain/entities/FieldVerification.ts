import type { FieldVerificationItemKey } from '@/domain/rules/fieldVerificationChecklist';
import type { VerificationResult } from '@/types/enums';

export interface FieldVerification {
  id: number;
  zoneId: number;
  performedBy: number;
  performedAt: number;
  notes: string | null;
}

export interface FieldVerificationItem {
  id: number;
  verificationId: number;
  itemKey: FieldVerificationItemKey;
  result: VerificationResult;
  observation: string | null;
}

export type NewFieldVerificationItem = Omit<FieldVerificationItem, 'id' | 'verificationId'>;

export type NewFieldVerification = Omit<FieldVerification, 'id' | 'performedAt'> & {
  items: NewFieldVerificationItem[];
};
