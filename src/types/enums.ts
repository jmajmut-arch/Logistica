export type Role = 'warehouse' | 'supervisor' | 'hse';

export type HazardClass =
  | 'class1_explosives'
  | 'class2_gases'
  | 'class3_flammable_liquids'
  | 'class4_flammable_solids'
  | 'class5_oxidizers'
  | 'class6_toxic'
  | 'class7_radioactive'
  | 'class8_corrosives'
  | 'class9_misc';

export type CompatibilityStatus = 'compatible' | 'incompatible';

export type AlertType = 'expiration' | 'limit_exceeded' | 'incompatibility';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus = 'pending' | 'resolved';
