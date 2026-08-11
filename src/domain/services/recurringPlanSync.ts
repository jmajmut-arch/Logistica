import { recurringPlanRuleRepository } from '@/data/repositories/recurringPlanRuleRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import { computeUpcomingScheduledDates } from '@/domain/rules/recurringPlanOccurrences';
import { startOfWeek } from '@/utils/timeBlocks';

/**
 * Se llama al abrir el plan (semanal o home delivery): revisa las reglas permanentes
 * activas y crea los items concretos que falten hasta el horizonte de generación, para
 * que la ventana de ocurrencias siempre esté completa sin necesidad de un job aparte.
 *
 * El "ya existe" se decide por semana (no por hora exacta): si el planificador edita el
 * horario de una ocurrencia puntual, esa semana sigue contando como cubierta y no se
 * genera un duplicado a la hora original de la regla. Si en cambio la elimina, se cancela
 * en vez de borrarse (ver transportPlanRepository.cancel) — la semana sigue contando como
 * cubierta aquí porque leemos también los items cancelados, así que no se regenera.
 */
export async function ensureRecurringPlanOccurrences(): Promise<void> {
  const rules = await recurringPlanRuleRepository.findAll();
  const activeRules = rules.filter((rule) => rule.active);
  if (activeRules.length === 0) {
    return;
  }

  const allItems = await transportPlanRepository.findAllIncludingCancelled();
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
        hasNoSchedule: false,
        reference: rule.reference,
        notes: rule.notes,
        requiresHeavyCrane: rule.requiresHeavyCrane,
        recurrenceRuleId: rule.id,
        cancelled: false,
        createdBy: rule.createdBy,
      });
      coveredWeeks.add(weekStart);
    }
  }
}
