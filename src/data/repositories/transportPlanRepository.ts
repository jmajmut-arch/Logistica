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

  /** Solo para la sincronización de reglas permanentes: items generados por alguna regla
   * (incluye cancelados, para no regenerar una semana que el planificador eliminó a
   * propósito), sin traer también los items sueltos — que son la mayoría de la tabla y no
   * le importan a este chequeo. */
  async findAllRecurringOccurrences(): Promise<TransportPlanItem[]> {
    const { data, error } = await supabase
      .from('transport_plan_items')
      .select('*')
      .not('recurrence_rule_id', 'is', null)
      .order('scheduled_at', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<TransportPlanItem>(data);
  },

  /** Inserta varios items de una sola vez (ej. materializar ocurrencias de reglas
   * permanentes) en vez de una llamada de red por fila. */
  async createMany(inputs: NewTransportPlanItem[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    const { error } = await supabase
      .from('transport_plan_items')
      .insert(inputs.map((input) => objectToSnakeCase(input)));
    if (error) throw error;
  },

  /** Igual que findAll pero acotado a un rango de fechas — usado por pantallas que solo
   * necesitan un período visible (ej. el día de hoy, un rango elegido, o un mes del
   * calendario) en vez de traer toda la tabla, que con el tiempo puede ser enorme. */
  async findByDateRange(start: number, end: number): Promise<TransportPlanItem[]> {
    const { data, error } = await supabase
      .from('transport_plan_items')
      .select('*')
      .eq('cancelled', false)
      .gte('scheduled_at', start)
      .lt('scheduled_at', end)
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
   * que la sincronización no la regenere. Ver findAllRecurringOccurrences. */
  async cancel(id: number): Promise<void> {
    const { error } = await supabase
      .from('transport_plan_items')
      .update({ cancelled: true })
      .eq('id', id);
    if (error) throw error;
  },

  /** El operador registra que el viaje nunca llegó. A diferencia de cancel(), el item
   * sigue existiendo para el resto de la app (no se excluye de findAll/findByDateRange):
   * cuenta como incumplimiento en el % de cumplimiento y sigue apareciendo en el plan y en
   * Llegadas, con quién y cuándo lo canceló para dejar registro. */
  async markCancelledByOperator(id: number, userId: number): Promise<void> {
    const { error } = await supabase
      .from('transport_plan_items')
      .update({ cancelled_by_operator: true, cancelled_by: userId, cancelled_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  },
};
