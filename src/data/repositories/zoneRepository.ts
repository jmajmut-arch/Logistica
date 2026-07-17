import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { Zone, ZoneClassLimit } from '@/domain/entities/Zone';
import type { HazardClass, Unit } from '@/types/enums';

export const zoneRepository = {
  async findAll(): Promise<Zone[]> {
    const { data, error } = await supabase.from('zones').select('*');
    if (error) throw error;
    return rowsToCamelCase<Zone>(data);
  },

  async findById(id: number): Promise<Zone | undefined> {
    const { data, error } = await supabase.from('zones').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<Zone>(data) : undefined;
  },

  async findClassLimits(zoneId: number): Promise<ZoneClassLimit[]> {
    const { data, error } = await supabase
      .from('zone_class_limits')
      .select('*')
      .eq('zone_id', zoneId);
    if (error) throw error;
    return rowsToCamelCase<ZoneClassLimit>(data);
  },

  async findAllClassLimits(): Promise<ZoneClassLimit[]> {
    const { data, error } = await supabase.from('zone_class_limits').select('*');
    if (error) throw error;
    return rowsToCamelCase<ZoneClassLimit>(data);
  },

  async upsertClassLimit(input: {
    zoneId: number;
    hazardClass: HazardClass;
    maxQuantity: number;
    unit: Unit;
  }): Promise<ZoneClassLimit> {
    const { data, error } = await supabase
      .from('zone_class_limits')
      .upsert(objectToSnakeCase(input), { onConflict: 'zone_id,hazard_class' })
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<ZoneClassLimit>(data);
  },
};
