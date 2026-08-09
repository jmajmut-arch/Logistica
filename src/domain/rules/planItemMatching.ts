import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { blockMinutesOf } from '@/utils/timeBlocks';

export interface MatchParams {
  siteId: number;
  dayStart: number;
  dayEnd: number;
  blockMinutes: number;
}

/**
 * Encuentra el item del plan al que corresponde una llegada registrada por sitio + día +
 * bloque horario de 30 minutos. Si hay más de un candidato (plan ambiguo) o ninguno, no
 * enlaza — la llegada queda registrada igual, solo que sin comparación de cumplimiento.
 */
export function findMatchingPlanItem(
  candidates: TransportPlanItem[],
  matchedPlanItemIds: ReadonlySet<number>,
  params: MatchParams,
): TransportPlanItem | null {
  const matches = candidates.filter(
    (item) =>
      item.siteId === params.siteId &&
      item.scheduledAt >= params.dayStart &&
      item.scheduledAt < params.dayEnd &&
      !matchedPlanItemIds.has(item.id) &&
      blockMinutesOf(item.scheduledAt) === params.blockMinutes,
  );
  return matches.length === 1 ? matches[0] : null;
}
