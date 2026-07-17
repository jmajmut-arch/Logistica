import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { NewSubstance, Substance } from '@/domain/entities/Substance';
import { sumQuantityByZoneAndClass, type ZoneClassTotal } from '@/domain/rules/capacityRules';

export type ZoneClassQuantity = ZoneClassTotal;

export const substanceRepository = {
  async findAll(): Promise<Substance[]> {
    const { data, error } = await supabase.from('substances').select('*');
    if (error) throw error;
    return rowsToCamelCase<Substance>(data);
  },

  async findById(id: number): Promise<Substance | undefined> {
    const { data, error } = await supabase
      .from('substances')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<Substance>(data) : undefined;
  },

  async findByZone(zoneId: number): Promise<Substance[]> {
    const { data, error } = await supabase.from('substances').select('*').eq('zone_id', zoneId);
    if (error) throw error;
    return rowsToCamelCase<Substance>(data);
  },

  async create(input: NewSubstance): Promise<Substance> {
    const now = Date.now();
    const { data, error } = await supabase
      .from('substances')
      .insert({ ...objectToSnakeCase(input), created_at: now, updated_at: now })
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Substance>(data);
  },

  async update(id: number, input: Partial<NewSubstance>): Promise<Substance> {
    const { data, error } = await supabase
      .from('substances')
      .update({ ...objectToSnakeCase(input), updated_at: Date.now() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Substance>(data);
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('substances').delete().eq('id', id);
    if (error) throw error;
  },

  /** Cantidad total almacenada por zona+clase — base de la validación de límites. */
  async sumQuantityByZoneAndClass(): Promise<ZoneClassQuantity[]> {
    const substances = await this.findAll();
    return sumQuantityByZoneAndClass(substances);
  },
};
