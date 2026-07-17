import { rowToCamelCase, rowsToCamelCase } from '@/data/supabase/caseMapping';
import { supabase } from '@/data/supabase/client';
import type { CompatibilityRule } from '@/domain/entities/CompatibilityRule';
import { normalizeClassPair } from '@/domain/rules/compatibilityRules';
import type { CompatibilityStatus, HazardClass } from '@/types/enums';

export const ruleRepository = {
  async findAll(): Promise<CompatibilityRule[]> {
    const { data, error } = await supabase.from('compatibility_rules').select('*');
    if (error) throw error;
    return rowsToCamelCase<CompatibilityRule>(data);
  },

  async upsert(
    classA: HazardClass,
    classB: HazardClass,
    status: CompatibilityStatus,
  ): Promise<CompatibilityRule> {
    const [normalizedA, normalizedB] = normalizeClassPair(classA, classB);
    const { data, error } = await supabase
      .from('compatibility_rules')
      .upsert(
        { class_a: normalizedA, class_b: normalizedB, status },
        { onConflict: 'class_a,class_b' },
      )
      .select()
      .single();
    if (error) throw error;
    return rowToCamelCase<CompatibilityRule>(data);
  },
};
