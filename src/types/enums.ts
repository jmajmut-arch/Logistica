export type Role = 'operator' | 'supervisor' | 'admin';

export const OPERATION_TYPES = ['carga_subida', 'retiro_carga', 'home_delivery'] as const;

export type OperationType = (typeof OPERATION_TYPES)[number];

export const SITE_TYPES = ['patio', 'bodega'] as const;

export type SiteType = (typeof SITE_TYPES)[number];

// Lo que el operador elige trabajar al iniciar sesión: agrupa los tipos de operación en
// dos frentes (el plan de transporte de patios/bodegas vs. home delivery), para acotar
// qué parte del plan le aparece.
export const OPERATOR_SCOPES = ['plan_transporte', 'home_delivery'] as const;

export type OperatorScope = (typeof OPERATOR_SCOPES)[number];

// Motivo de una incidencia de guía de despacho: no fue ingresada por el operador
// logístico, o algún otro problema (descrito en el campo de texto libre).
export const DISPATCH_ISSUE_TYPES = ['no_ingresada', 'otro'] as const;

export type DispatchIssueType = (typeof DISPATCH_ISSUE_TYPES)[number];

export const DISPATCH_ISSUE_STATUSES = ['open', 'closed'] as const;

export type DispatchIssueStatus = (typeof DISPATCH_ISSUE_STATUSES)[number];
