export type Role = 'operator' | 'supervisor';

export const OPERATION_TYPES = ['carga_subida', 'retiro_carga', 'home_delivery'] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];

export const SITE_TYPES = ['patio', 'bodega'] as const;

export type SiteType = (typeof SITE_TYPES)[number];
