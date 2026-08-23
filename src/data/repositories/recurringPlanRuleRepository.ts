import { objectToSnakeCase, rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { NewRecurringPlanRule, RecurringPlanRule } from '@/domain/entities/RecurringPlanRule';

export const recurringPlanRuleRepository = {
  async findAll(): Promise<RecurringPlanRule[]> {
    const { data, error } = await supabase
      .from('recurring_plan_rules')
      .select('*')
      .order('day_of_week', { ascending: true });
    if (error) throw error;
    return rowsToCamelCase<RecurringPlanRule>(data);
  },

  async findById(id: number): Promise<RecurringPlanRule | undefined> {
    const { data, error } = await supabase
      .from('recurring_plan_rules')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCamelCase<RecurringPlanRule>(data) : undefined;
  },

  async create(input: NewRecurringPlanRule): Promise<RecurringPlanRule> {
    const { data, error } = await supabase
      .from('recurring_plan_rules')
      .insert(objectToSnakeCase(input))
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<RecurringPlanRule>(data);
  },

  async update(id: number, input: NewRecurringPlanRule): Promise<RecurringPlanRule> {
    const { data, error } = await supabase
      .from('recurring_plan_rules')
      .update(objectToSnakeCase(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<RecurringPlanRule>(data);
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('recurring_plan_rules').delete().eq('id', id);
    if (error) throw error;
  },
};
