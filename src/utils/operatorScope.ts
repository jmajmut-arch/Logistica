import type { MaterialCommunityIcons } from '@expo/vector-icons';

import type { OperationType, OperatorScope, Role } from '@/types/enums';

export const OPERATOR_SCOPE_LABELS: Record<OperatorScope, string> = {
  plan_transporte: 'Plan de transporte',
  home_delivery: 'Home delivery',
};

export const OPERATOR_SCOPE_ICONS: Record<OperatorScope, keyof typeof MaterialCommunityIcons.glyphMap> = {
  plan_transporte: 'warehouse',
  home_delivery: 'home-city-outline',
};

const PLAN_TRANSPORTE_OPERATION_TYPES: OperationType[] = ['carga_subida', 'retiro_carga'];

/** true si el tipo de operación corresponde al frente de trabajo elegido por el operador. */
export function matchesOperatorScope(
  operationType: OperationType,
  scope: OperatorScope | null,
): boolean {
  if (scope === null) {
    return true;
  }
  if (scope === 'home_delivery') {
    return operationType === 'home_delivery';
  }
  return PLAN_TRANSPORTE_OPERATION_TYPES.includes(operationType);
}

/**
 * Quién carga qué parte del plan semanal: el administrador ingresa el plan de home
 * delivery, el supervisor el de patios/bodegas (carga subida y retiro).
 */
export function getPlanManagerScope(role: Role | undefined): OperatorScope {
  return role === 'admin' ? 'home_delivery' : 'plan_transporte';
}
