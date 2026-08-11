import type { DispatchIssueStatus, DispatchIssueType } from '@/types/enums';

export interface DispatchIssue {
  id: number;
  guideNumber: string;
  siteId: number;
  carrierId: number | null;
  issueType: DispatchIssueType;
  description: string;
  /** Documento adjunto (PDF o foto de la guía), si se subió alguno al levantar la incidencia. */
  guideFileUrl: string | null;
  guideFileName: string | null;
  /** Persona a notificar por correo al levantar la incidencia, si se eligió alguna. */
  notifyUserId: number | null;
  status: DispatchIssueStatus;
  raisedBy: number;
  raisedAt: number;
  closedBy: number | null;
  closedAt: number | null;
  resolutionNotes: string | null;
}

export type NewDispatchIssue = Omit<DispatchIssue, 'id' | 'raisedAt'>;
