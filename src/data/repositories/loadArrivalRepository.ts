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

  async create(input: NewLoadArrival): Promise<LoadArrival> {
    const { data, error } = await supabase
      .from('load_arrivals')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<LoadArrival>(data);
  },
};
