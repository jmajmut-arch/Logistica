import type { AlertSeverity, AlertType } from '@/types/enums';

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

// Orden de mayor a menor riesgo, usado para ordenar listas y para iterar en la UI.
export const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: '#B3261E',
  high: '#E4572E',
  medium: '#C77700',
  low: '#6B7280',
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  expiration: 'Vencimiento',
  limit_exceeded: 'Límite excedido',
  incompatibility: 'Incompatibilidad',
};
