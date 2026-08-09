import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { LoadArrival, NewLoadArrival } from '@/domain/entities/LoadArrival';

export const loadArrivalRepository = {
  async findAll(): Promise<LoadArrival[]> {
    const { data, error } = await supabase
      .from('load_arrivals')
      .select('*')
      .order('arrived_at', { ascending: false });
    if (error) throw error;
    return rowsToCamelCase<LoadArrival>(data);
  },

  async findById(id: number): Promise<LoadArrival | undefined> {
    const { data, error } = await supabase.from('load_arrivals').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<LoadArrival>(data) : undefined;
  },

  async create(input: NewLoadArrival): Promise<LoadArrival> {
    const { data, error } = await supabase
      .from('load_arrivals')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<LoadArrival>(data);
  },

  async update(id: number, input: NewLoadArrival): Promise<LoadArrival> {
    const { data, error } = await supabase
      .from('load_arrivals')
      .update(objectToSnakeCase(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<LoadArrival>(data);
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('load_arrivals').delete().eq('id', id);
    if (error) throw error;
  },
};
