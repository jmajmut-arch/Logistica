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

// TODO(Fase 2): detección de incompatibilidad entre sustancias co-ubicadas en una zona,
// orquestada por domain/rules/alertEngine.ts.
