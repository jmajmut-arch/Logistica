/**
 * Separa una lista de items del plan entre los realmente pendientes (accionables) y los
 * que el operador ya marcó como cancelados — para que una pantalla no los mezcle bajo el
 * mismo título "Pendientes" (el conteo de pendientes ya no incluye a los cancelados, ver
 * dashboardMetrics.pendingCount, así que la lista tampoco debería). Los cancelados quedan
 * ordenados del más reciente al más antiguo.
 */
export function splitCancelledByOperator<
  T extends { cancelledByOperator: boolean; cancelledAt: number | null },
>(items: T[]): { pending: T[]; cancelled: T[] } {
  const pending: T[] = [];
  const cancelled: T[] = [];
  for (const item of items) {
    if (item.cancelledByOperator) {
      cancelled.push(item);
    } else {
      pending.push(item);
    }
  }
  cancelled.sort((a, b) => (b.cancelledAt ?? 0) - (a.cancelledAt ?? 0));
  return { pending, cancelled };
}
