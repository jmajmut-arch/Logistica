import { fieldVerificationRepository } from '@/data/repositories/fieldVerificationRepository';
import { recalculateAlerts } from '@/domain/services/alertService';
import type { FieldVerification, NewFieldVerification } from '@/domain/entities/FieldVerification';

export const fieldVerificationService = {
  async create(input: NewFieldVerification): Promise<FieldVerification> {
    const created = await fieldVerificationRepository.create(input);
    await recalculateAlerts();
    return created;
  },
};
