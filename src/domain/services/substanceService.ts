import { substanceRepository } from '@/data/repositories/substanceRepository';
import { recalculateAlerts } from '@/domain/services/alertService';
import type { NewSubstance, Substance } from '@/domain/entities/Substance';
import { deleteSdsFile } from '@/utils/sdsStorage';

export const substanceService = {
  async create(input: NewSubstance): Promise<Substance> {
    const created = await substanceRepository.create(input);
    await recalculateAlerts();
    return created;
  },

  async update(id: number, input: Partial<NewSubstance>): Promise<Substance> {
    const existing = await substanceRepository.findById(id);
    const updated = await substanceRepository.update(id, input);
    if (existing?.sdsUri && input.sdsUri !== undefined && input.sdsUri !== existing.sdsUri) {
      deleteSdsFile(existing.sdsUri);
    }
    await recalculateAlerts();
    return updated;
  },

  async delete(id: number): Promise<void> {
    const existing = await substanceRepository.findById(id);
    await substanceRepository.delete(id);
    if (existing?.sdsUri) {
      deleteSdsFile(existing.sdsUri);
    }
    await recalculateAlerts();
  },
};
