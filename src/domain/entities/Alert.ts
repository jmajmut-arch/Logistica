import type { AlertSeverity, AlertStatus, AlertType } from '@/types/enums';

export interface Alert {
  id: number;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  relatedSubstanceId: number | null;
  relatedZoneId: number | null;
  message: string;
  createdAt: number;
  resolvedAt: number | null;
  resolvedBy: number | null;
}
