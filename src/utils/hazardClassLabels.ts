import type { HazardClass } from '@/types/enums';

export const HAZARD_CLASS_LABELS: Record<HazardClass, string> = {
  class1_explosives: 'Clase 1 - Explosivos',
  class2_gases: 'Clase 2 - Gases',
  class3_flammable_liquids: 'Clase 3 - Líquidos inflamables',
  class4_flammable_solids: 'Clase 4 - Sólidos inflamables',
  class5_oxidizers: 'Clase 5 - Oxidantes y peróxidos',
  class6_toxic: 'Clase 6 - Tóxicos e infecciosos',
  class7_radioactive: 'Clase 7 - Radiactivos',
  class8_corrosives: 'Clase 8 - Corrosivos',
  class9_misc: 'Clase 9 - Varios',
};
