import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { NewSite, Site } from '@/domain/entities/Site';

export const siteRepository = {
  async findAll(): Promise<Site[]> {
    const { data, error } = await supabase.from('sites').select('*').order('name', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<Site>(data);
  },

  async findById(id: number): Promise<Site | undefined> {
    const { data, error } = await supabase.from('sites').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<Site>(data) : undefined;
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

  async update(id: number, input: NewSite): Promise<Site> {
    const { data, error } = await supabase
      .from('sites')
      .update(objectToSnakeCase(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Site>(data);
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('sites').delete().eq('id', id);
    if (error) throw error;
  },
};
