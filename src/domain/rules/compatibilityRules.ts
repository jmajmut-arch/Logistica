import type { CompatibilityRule } from '@/domain/entities/CompatibilityRule';
import type { HazardClass } from '@/types/enums';

/**
 * compatibility_rules guarda cada par de clases una sola vez. Sin esta normalización,
 * (A, B) y (B, A) se tratarían como reglas distintas y violarían el índice único
 * (class_a, class_b) de forma inconsistente según el orden de inserción.
 */
export function normalizeClassPair(
  classA: HazardClass,
  classB: HazardClass,
): [HazardClass, HazardClass] {
  return classA <= classB ? [classA, classB] : [classB, classA];
}

export interface IncompatibilityFinding {
  zoneId: number;
  classA: HazardClass;
  classB: HazardClass;
}

/**
 * Un par de clases co-ubicadas sin regla configurada NO genera alerta: se asume
 * compatible por defecto hasta que Supervisor defina explícitamente lo contrario. Esto evita
 * saturar de alertas de "incompatibilidad desconocida" apenas se siembra una zona nueva.
 */
export function findIncompatibilitiesInZone(
  zoneId: number,
  hazardClassesPresent: HazardClass[],
  rules: CompatibilityRule[],
): IncompatibilityFinding[] {
  const uniqueClasses = Array.from(new Set(hazardClassesPresent));
  const findings: IncompatibilityFinding[] = [];

  for (let i = 0; i < uniqueClasses.length; i++) {
    for (let j = i + 1; j < uniqueClasses.length; j++) {
      const [classA, classB] = normalizeClassPair(uniqueClasses[i], uniqueClasses[j]);
      const rule = rules.find(
        (candidate) => candidate.classA === classA && candidate.classB === classB,
      );
      if (rule?.status === 'incompatible') {
        findings.push({ zoneId, classA, classB });
      }
    }
  }

  return findings;
}

export function findIncompatibilities(
  hazardClassesByZone: Map<number, HazardClass[]>,
  rules: CompatibilityRule[],
): IncompatibilityFinding[] {
  const findings: IncompatibilityFinding[] = [];
  for (const [zoneId, classes] of hazardClassesByZone) {
    findings.push(...findIncompatibilitiesInZone(zoneId, classes, rules));
  }
  return findings;
}
