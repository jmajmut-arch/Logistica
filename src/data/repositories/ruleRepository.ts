import { and, eq } from 'drizzle-orm';

import { db } from '@/data/db/client';
import { compatibilityRules } from '@/data/db/schema';
import type { CompatibilityRule } from '@/domain/entities/CompatibilityRule';
import { normalizeClassPair } from '@/domain/rules/compatibilityRules';
import type { CompatibilityStatus, HazardClass } from '@/types/enums';

export const ruleRepository = {
  async findAll(): Promise<CompatibilityRule[]> {
    return db.select().from(compatibilityRules);
  },

  async upsert(
    classA: HazardClass,
    classB: HazardClass,
    status: CompatibilityStatus,
  ): Promise<CompatibilityRule> {
    const [normalizedA, normalizedB] = normalizeClassPair(classA, classB);
    const [existing] = await db
      .select()
      .from(compatibilityRules)
      .where(
        and(eq(compatibilityRules.classA, normalizedA), eq(compatibilityRules.classB, normalizedB)),
      );

    if (existing) {
      const [updated] = await db
        .update(compatibilityRules)
        .set({ status })
        .where(eq(compatibilityRules.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(compatibilityRules)
      .values({ classA: normalizedA, classB: normalizedB, status })
      .returning();
    return created;
  },
};
