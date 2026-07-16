import { and, eq } from 'drizzle-orm';

import { db } from '@/data/db/client';
import { zoneClassLimits, zones } from '@/data/db/schema';
import type { Zone, ZoneClassLimit } from '@/domain/entities/Zone';
import type { HazardClass } from '@/types/enums';

export const zoneRepository = {
  async findAll(): Promise<Zone[]> {
    return db.select().from(zones);
  },

  async findById(id: number): Promise<Zone | undefined> {
    const [zone] = await db.select().from(zones).where(eq(zones.id, id));
    return zone;
  },

  async findClassLimits(zoneId: number): Promise<ZoneClassLimit[]> {
    return db.select().from(zoneClassLimits).where(eq(zoneClassLimits.zoneId, zoneId));
  },

  async findAllClassLimits(): Promise<ZoneClassLimit[]> {
    return db.select().from(zoneClassLimits);
  },

  async upsertClassLimit(input: {
    zoneId: number;
    hazardClass: HazardClass;
    maxQuantity: number;
    unit: string;
  }): Promise<ZoneClassLimit> {
    const [existing] = await db
      .select()
      .from(zoneClassLimits)
      .where(
        and(
          eq(zoneClassLimits.zoneId, input.zoneId),
          eq(zoneClassLimits.hazardClass, input.hazardClass),
        ),
      );

    if (existing) {
      const [updated] = await db
        .update(zoneClassLimits)
        .set({ maxQuantity: input.maxQuantity, unit: input.unit })
        .where(eq(zoneClassLimits.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(zoneClassLimits).values(input).returning();
    return created;
  },
};
