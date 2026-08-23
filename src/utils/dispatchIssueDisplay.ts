import type { DispatchIssueStatus, DispatchIssueType } from '@/types/enums';

export const DISPATCH_ISSUE_TYPE_LABELS: Record<DispatchIssueType, string> = {
  no_ingresada: 'No ingresada por el operador logístico',
  otro: 'Otro problema',
};

export const DISPATCH_ISSUE_TYPE_LABELS_SHORT: Record<DispatchIssueType, string> = {
  no_ingresada: 'No ingresada',
  otro: 'Otro',
};

export const DISPATCH_ISSUE_STATUS_LABELS: Record<DispatchIssueStatus, string> = {
  open: 'Abierta',
  closed: 'Cerrada',
};

export const DISPATCH_ISSUE_STATUS_COLORS: Record<DispatchIssueStatus, string> = {
  open: '#DC2626',
  closed: '#2E7D32',
};
