import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { NewSite, Site } from '@/domain/entities/Site';

export const siteRepository = {
  async findAll(): Promise<Site[]> {
    const { data, error } = await supabase.from('sites').select('*').order('name', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<Site>(data);
  },

  async create(input: NewSite): Promise<Site> {
    const { data, error } = await supabase
      .from('sites')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Site>(data);
  },
};
