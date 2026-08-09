import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { NewTransportPlanItem, TransportPlanItem } from '@/domain/entities/TransportPlanItem';

export const transportPlanRepository = {
  async findAll(): Promise<TransportPlanItem[]> {
    const { data, error } = await supabase
      .from('transport_plan_items')
      .select('*')
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<TransportPlanItem>(data);
  },

  async create(input: NewTransportPlanItem): Promise<TransportPlanItem> {
    const { data, error } = await supabase
      .from('transport_plan_items')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<TransportPlanItem>(data);
  },
};
