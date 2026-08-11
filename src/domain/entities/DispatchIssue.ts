import type { DispatchIssueStatus, DispatchIssueType } from '@/types/enums';

export interface DispatchIssue {
  id: number;
  guideNumber: string;
  siteId: number;
  carrierId: number | null;
  issueType: DispatchIssueType;
  description: string;
  status: DispatchIssueStatus;
  raisedBy: number;
  raisedAt: number;
  closedBy: number | null;
  closedAt: number | null;
  resolutionNotes: string | null;
}

export type NewDispatchIssue = Omit<DispatchIssue, 'id' | 'raisedAt'>;
