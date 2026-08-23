import type { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Role } from '@/types/enums';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Planificador',
  operator: 'Operador',
  supervisor: 'Supervisor',
};

export const ROLE_ICONS: Record<Role, keyof typeof MaterialCommunityIcons.glyphMap> = {
  admin: 'shield-account-outline',
  operator: 'truck-delivery-outline',
  supervisor: 'shield-check-outline',
};

export const ROLE_COLORS: Record<Role, string> = {
  admin: '#a78bfa',
  operator: '#38bdf8',
  supervisor: '#fb923c',
};
