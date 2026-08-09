import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { NewTruckArrival, TruckArrival } from '@/domain/entities/TruckArrival';

export const truckArrivalRepository = {
  async findAll(): Promise<TruckArrival[]> {
    const { data, error } = await supabase
      .from('truck_arrivals')
      .select('*')
      .order('arrived_at', { ascending: false });
    if (error) throw error;
    return rowsToCamelCase<TruckArrival>(data);
  },

  async create(input: NewTruckArrival): Promise<TruckArrival> {
    const { data, error } = await supabase
      .from('truck_arrivals')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<TruckArrival>(data);
  },
};
