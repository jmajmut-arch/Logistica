import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { NewTransportPlanItem, TransportPlanItem } from '@/domain/entities/TransportPlanItem';

export const transportPlanRepository = {
  /** Excluye los items cancelados: para el resto de la app (dashboard, llegadas, listas)
   * un item cancelado se ve exactamente como si se hubiera borrado. */
  async findAll(): Promise<TransportPlanItem[]> {
    const { data, error } = await supabase
      .from('transport_plan_items')
      .select('*')
      .eq('cancelled', false)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<TransportPlanItem>(data);
  },

  /** Solo para la sincronización de reglas permanentes: necesita ver también los items
   * cancelados para no regenerar una semana que el planificador eliminó a propósito. */
  async findAllIncludingCancelled(): Promise<TransportPlanItem[]> {
    const { data, error } = await supabase
      .from('transport_plan_items')
      .select('*')
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<TransportPlanItem>(data);
  },

  async findById(id: number): Promise<TransportPlanItem | undefined> {
    const { data, error } = await supabase
      .from('transport_plan_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<TransportPlanItem>(data) : undefined;
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

  async update(id: number, input: NewTransportPlanItem): Promise<TransportPlanItem> {
    const { data, error } = await supabase
      .from('transport_plan_items')
      .update(objectToSnakeCase(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<TransportPlanItem>(data);
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('transport_plan_items').delete().eq('id', id);
    if (error) throw error;
  },

  /** "Borra" una ocurrencia generada por una regla permanente sin liberar su semana, para
   * que la sincronización no la regenere. Ver findAllIncludingCancelled. */
  async cancel(id: number): Promise<void> {
    const { error } = await supabase
      .from('transport_plan_items')
      .update({ cancelled: true })
      .eq('id', id);
    if (error) throw error;
  },
};
