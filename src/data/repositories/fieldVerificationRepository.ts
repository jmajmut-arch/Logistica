import { rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type {
  FieldVerification,
  FieldVerificationItem,
  NewFieldVerification,
} from '@/domain/entities/FieldVerification';

export interface ZoneLatestVerification {
  zoneId: number;
  performedAt: number;
}

export const fieldVerificationRepository = {
  async findAll(): Promise<FieldVerification[]> {
    const { data, error } = await supabase
      .from('field_verifications')
      .select('*')
      .order('performed_at', { ascending: false });
    if (error) throw error;
    return rowsToCamelCase<FieldVerification>(data);
  },

  async findByZone(zoneId: number): Promise<FieldVerification[]> {
    const { data, error } = await supabase
      .from('field_verifications')
      .select('*')
      .eq('zone_id', zoneId)
      .order('performed_at', { ascending: false });
    if (error) throw error;
    return rowsToCamelCase<FieldVerification>(data);
  },

  async findItems(verificationId: number): Promise<FieldVerificationItem[]> {
    const { data, error } = await supabase
      .from('field_verification_items')
      .select('*')
      .eq('verification_id', verificationId);
    if (error) throw error;
    return rowsToCamelCase<FieldVerificationItem>(data);
  },

  async findAllItems(): Promise<FieldVerificationItem[]> {
    const { data, error } = await supabase.from('field_verification_items').select('*');
    if (error) throw error;
    return rowsToCamelCase<FieldVerificationItem>(data);
  },

  /** Última fecha de verificación por zona — base de la regla de atraso (ver verificationRules.ts). */
  async findLatestByZone(): Promise<ZoneLatestVerification[]> {
    const { data, error } = await supabase
      .from('field_verifications')
      .select('zone_id, performed_at');
    if (error) throw error;

    const latestByZone = new Map<number, number>();
    for (const row of data) {
      const zoneId = row.zone_id as number;
      const performedAt = row.performed_at as number;
      const current = latestByZone.get(zoneId);
      if (current === undefined || performedAt > current) {
        latestByZone.set(zoneId, performedAt);
      }
    }
    return Array.from(latestByZone, ([zoneId, performedAt]) => ({ zoneId, performedAt }));
  },

  async create(input: NewFieldVerification): Promise<FieldVerification> {
    const { data: created, error: verificationError } = await supabase
      .from('field_verifications')
      .insert({ zone_id: input.zoneId, performed_by: input.performedBy, notes: input.notes })
      .select()
      .single();
    if (verificationError) throw verificationError;

    const verification = rowToCamelCase<FieldVerification>(created);

    const { error: itemsError } = await supabase.from('field_verification_items').insert(
      input.items.map((item) => ({
        verification_id: verification.id,
        item_key: item.itemKey,
        result: item.result,
        observation: item.observation,
      })),
    );
    if (itemsError) throw itemsError;

    return verification;
  },
};
