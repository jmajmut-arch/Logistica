import { createContext, useContext } from 'react';

import type { OperatorScope } from '@/types/enums';

/** Qué parte del plan gestiona esta instancia del stack (plan de transporte u home
 * delivery): ya no se puede inferir del rol porque el planificador ahora ve ambos tabs. */
const PlanScopeContext = createContext<OperatorScope | null>(null);

export const PlanScopeProvider = PlanScopeContext.Provider;

export function usePlanScope(): OperatorScope {
  const scope = useContext(PlanScopeContext);
  if (scope === null) {
    throw new Error('usePlanScope debe usarse dentro de un PlanScopeProvider');
  }
  return scope;
}
