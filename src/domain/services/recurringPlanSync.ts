import { recurringPlanRuleRepository } from '@/data/repositories/recurringPlanRuleRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import { computeUpcomingScheduledDates } from '@/domain/rules/recurringPlanOccurrences';
import { startOfWeek } from '@/utils/timeBlocks';

/**
 * Se llama al abrir el plan (semanal o home delivery): revisa las reglas permanentes
 * activas y crea los items concretos que falten hasta el horizonte de generación, para
 * que la ventana de ocurrencias siempre esté completa sin necesidad de un job aparte.
 *
 * El "ya existe" se decide por semana (no por hora exacta): si el operador o el
 * administrador edita el horario de una ocurrencia puntual, esa semana sigue contando
 * como cubierta y no se genera un duplicado a la hora original de la regla. Si en cambio
 * la elimina, la semana vuelve a quedar libre y se regenerará en la próxima sincronización
 * — es la única forma simple de "saltarse" una fecha sin una tabla de excepciones aparte.
 */
export async function ensureRecurringPlanOccurrences(): Promise<void> {
  const rules = await recurringPlanRuleRepository.findAll();
  const activeRules = rules.filter((rule) => rule.active);
  if (activeRules.length === 0) {
    return;
  }

  const allItems = await transportPlanRepository.findAll();
  const coveredWeeksByRule = new Map<number, Set<number>>();
  for (const item of allItems) {
    if (item.recurrenceRuleId === null) {
      continue;
    }
    const weeks = coveredWeeksByRule.get(item.recurrenceRuleId) ?? new Set<number>();
    weeks.add(startOfWeek(item.scheduledAt));
    coveredWeeksByRule.set(item.recurrenceRuleId, weeks);
  }

  for (const rule of activeRules) {
    const coveredWeeks = coveredWeeksByRule.get(rule.id) ?? new Set<number>();
    const wantedDates = computeUpcomingScheduledDates(rule.dayOfWeek, rule.blockMinutes);
    for (const scheduledAt of wantedDates) {
      const weekStart = startOfWeek(scheduledAt);
      if (coveredWeeks.has(weekStart)) {
        continue;
      }
      await transportPlanRepository.create({
        operationType: rule.operationType,
        siteId: rule.siteId,
        carrierId: rule.carrierId,
        scheduledAt,
        reference: rule.reference,
        notes: rule.notes,
        recurrenceRuleId: rule.id,
        createdBy: rule.createdBy,
      });
      coveredWeeks.add(weekStart);
    }
  }
}
