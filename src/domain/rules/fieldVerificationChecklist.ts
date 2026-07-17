// Checklist fijo de verificación en terreno, cubriendo los puntos de control más
// comunes exigidos por el DS 43 (almacenamiento de sustancias peligrosas) y normativa
// asociada (DS 594 sobre condiciones sanitarias y ambientales, NCh 2190 señalización).
// No reemplaza una auditoría legal formal: es una guía operativa para la inspección
// periódica de bodega que HSE puede complementar según el detalle de cada faena.
export const FIELD_VERIFICATION_ITEMS = [
  { key: 'signage', label: 'Señalización de riesgo visible y vigente (NCh 2190)' },
  { key: 'sds_available', label: 'Hojas de datos de seguridad (SDS) disponibles y accesibles' },
  { key: 'fire_extinguishers', label: 'Extintores vigentes, accesibles y con carga al día' },
  {
    key: 'secondary_containment',
    label: 'Contención secundaria / bandejas antiderrame en buen estado',
  },
  { key: 'ventilation', label: 'Ventilación del recinto adecuada' },
  { key: 'ppe_available', label: 'Elementos de protección personal (EPP) disponibles' },
  {
    key: 'incompatibility_segregation',
    label: 'Segregación por incompatibilidad química respetada',
  },
  { key: 'evacuation_routes', label: 'Vías de evacuación despejadas y señalizadas' },
  { key: 'spill_kit', label: 'Kit de derrames disponible y completo' },
  { key: 'emergency_shower', label: 'Ducha de emergencia / lavaojos operativos (si aplica)' },
  { key: 'floor_condition', label: 'Piso impermeable, sin grietas ni derrames acumulados' },
  { key: 'stock_register_updated', label: 'Registro de stock actualizado y visible en bodega' },
] as const;

export type FieldVerificationItemKey = (typeof FIELD_VERIFICATION_ITEMS)[number]['key'];

export const FIELD_VERIFICATION_ITEM_LABELS: Record<FieldVerificationItemKey, string> =
  Object.fromEntries(FIELD_VERIFICATION_ITEMS.map((item) => [item.key, item.label])) as Record<
    FieldVerificationItemKey,
    string
  >;
