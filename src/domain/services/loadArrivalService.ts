import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import { combineDayAndBlock, startOfToday } from '@/utils/timeBlocks';

export interface RegisterLoadArrivalInput {
  siteId: number;
  blockMinutes: number;
  /** Item del plan que el operador eligió, o null si es un viaje no planificado. */
  planItemId: number | null;
  registeredBy: number;
}

export const loadArrivalService = {
  /** Registra la llegada de hoy (sitio + bloque de 30 min), enlazada al item del plan elegido. */
  async register(input: RegisterLoadArrivalInput): Promise<LoadArrival> {
    const arrivedAt = combineDayAndBlock(startOfToday(), input.blockMinutes);
    return loadArrivalRepository.create({
      siteId: input.siteId,
      arrivedAt,
      planItemId: input.planItemId,
      registeredBy: input.registeredBy,
    });
  },
};
