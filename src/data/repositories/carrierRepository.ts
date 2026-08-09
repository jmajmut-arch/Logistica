import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { Carrier, NewCarrier } from '@/domain/entities/Carrier';

export const carrierRepository = {
  async findAll(): Promise<Carrier[]> {
    const { data, error } = await supabase.from('carriers').select('*').order('name', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<Carrier>(data);
  },

  async findById(id: number): Promise<Carrier | undefined> {
    const { data, error } = await supabase.from('carriers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<Carrier>(data) : undefined;
  },

  async create(input: NewCarrier): Promise<Carrier> {
    const { data, error } = await supabase
      .from('carriers')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Carrier>(data);
  },

  async update(id: number, input: NewCarrier): Promise<Carrier> {
    const { data, error } = await supabase
      .from('carriers')
      .update(objectToSnakeCase(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Carrier>(data);
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('carriers').delete().eq('id', id);
    if (error) throw error;
  },
};
