export type Role = 'operator' | 'supervisor';

export const OPERATION_TYPES = ['carga_subida', 'retiro_carga', 'home_delivery'] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];
