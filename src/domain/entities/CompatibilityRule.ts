import type { CompatibilityStatus, HazardClass } from '@/types/enums';

export interface CompatibilityRule {
  id: number;
  classA: HazardClass;
  classB: HazardClass;
  status: CompatibilityStatus;
}
