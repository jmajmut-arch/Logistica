import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { Alert } from '@/domain/entities/Alert';
import type { AlertSeverity, AlertStatus } from '@/types/enums';

export type NewAlert = Omit<Alert, 'id' | 'createdAt' | 'resolvedAt' | 'resolvedBy'>;

export const alertRepository = {
  async findAll(): Promise<Alert[]> {
    const { data, error } = await supabase.from('alerts').select('*');
    if (error) throw error;
    return rowsToCamelCase<Alert>(data);
  },

  async findByStatus(status: AlertStatus): Promise<Alert[]> {
    const { data, error } = await supabase.from('alerts').select('*').eq('status', status);
    if (error) throw error;
    return rowsToCamelCase<Alert>(data);
  },

  async create(input: NewAlert): Promise<Alert> {
    const { data, error } = await supabase
      .from('alerts')
      .insert({ ...objectToSnakeCase(input), created_at: Date.now() })
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Alert>(data);
  },

  async updateContent(
    id: number,
    content: { severity: AlertSeverity; message: string },
  ): Promise<Alert> {
    const { data, error } = await supabase
      .from('alerts')
      .update(content)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Alert>(data);
  },

  /** resolvedBy null indica que el sistema la resolvió automáticamente (ya no aplica), no una persona. */
  async resolve(id: number, resolvedBy: number | null): Promise<Alert> {
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: Date.now(), resolved_by: resolvedBy })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<Alert>(data);
  },

  async deleteAll(): Promise<void> {
    const { error } = await supabase.from('alerts').delete().gte('id', 0);
    if (error) throw error;
  },
};
