import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { DispatchIssue, NewDispatchIssue } from '@/domain/entities/DispatchIssue';

export const dispatchIssueRepository = {
  async findAll(): Promise<DispatchIssue[]> {
    const { data, error } = await supabase
      .from('dispatch_issues')
      .select('*')
      .order('raised_at', { ascending: false });
    if (error) throw error;
    return rowsToCamelCase<DispatchIssue>(data);
  },

  async findById(id: number): Promise<DispatchIssue | undefined> {
    const { data, error } = await supabase
      .from('dispatch_issues')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<DispatchIssue>(data) : undefined;
  },

  async create(input: NewDispatchIssue): Promise<DispatchIssue> {
    const { data, error } = await supabase
      .from('dispatch_issues')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<DispatchIssue>(data);
  },

  /** Cierra (regulariza) una incidencia abierta; no hay reapertura, ver el módulo. */
  async close(
    id: number,
    payload: { closedBy: number; closedAt: number; resolutionNotes: string | null },
  ): Promise<DispatchIssue> {
    const { data, error } = await supabase
      .from('dispatch_issues')
      .update(objectToSnakeCase({ status: 'closed', ...payload }))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<DispatchIssue>(data);
  },
};
