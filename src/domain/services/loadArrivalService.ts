import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import { findMatchingPlanItem } from '@/domain/rules/planItemMatching';
import { combineDayAndBlock, startOfToday } from '@/utils/timeBlocks';

export interface RegisterLoadArrivalInput {
  siteId: number;
  blockMinutes: number;
  registeredBy: number;
}

export const loadArrivalService = {
  /** Registra la llegada de hoy (sitio + bloque de 30 min) y la enlaza al item del plan que calce, si hay uno. */
  async register(input: RegisterLoadArrivalInput): Promise<LoadArrival> {
    const dayStart = startOfToday();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const arrivedAt = combineDayAndBlock(dayStart, input.blockMinutes);

    const [planItems, arrivals] = await Promise.all([
      transportPlanRepository.findAll(),
      loadArrivalRepository.findAll(),
    ]);
    const matchedPlanItemIds = new Set(
      arrivals.map((arrival) => arrival.planItemId).filter((id): id is number => id !== null),
    );
    const matchedPlanItem = findMatchingPlanItem(planItems, matchedPlanItemIds, {
      siteId: input.siteId,
      dayStart,
      dayEnd,
      blockMinutes: input.blockMinutes,
    });

    return loadArrivalRepository.create({
      siteId: input.siteId,
      arrivedAt,
      planItemId: matchedPlanItem?.id ?? null,
      registeredBy: input.registeredBy,
    });
  },
};
