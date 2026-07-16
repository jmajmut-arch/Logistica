import { eq, sql } from 'drizzle-orm';

import { db } from '@/data/db/client';
import { substances } from '@/data/db/schema';
import type { NewSubstance, Substance } from '@/domain/entities/Substance';
import type { HazardClass } from '@/types/enums';

export interface ZoneClassQuantity {
  zoneId: number;
  hazardClass: HazardClass;
  totalQuantity: number;
}

export const substanceRepository = {
  async findAll(): Promise<Substance[]> {
    return db.select().from(substances);
  },

  async findById(id: number): Promise<Substance | undefined> {
    const [substance] = await db.select().from(substances).where(eq(substances.id, id));
    return substance;
  },

  async findByZone(zoneId: number): Promise<Substance[]> {
    return db.select().from(substances).where(eq(substances.zoneId, zoneId));
  },

  async create(input: NewSubstance): Promise<Substance> {
    const now = Date.now();
    const [created] = await db
      .insert(substances)
      .values({ ...input, createdAt: now, updatedAt: now })
      .returning();
    return created;
  },

  async update(id: number, input: Partial<NewSubstance>): Promise<Substance> {
    const [updated] = await db
      .update(substances)
      .set({ ...input, updatedAt: Date.now() })
      .where(eq(substances.id, id))
      .returning();
    return updated;
  },

  async delete(id: number): Promise<void> {
    await db.delete(substances).where(eq(substances.id, id));
  },

  /** Cantidad total almacenada por zona+clase — base de la validación de límites. */
  async sumQuantityByZoneAndClass(): Promise<ZoneClassQuantity[]> {
    const rows = await db
      .select({
        zoneId: substances.zoneId,
        hazardClass: substances.hazardClass,
        totalQuantity: sql<number>`sum(${substances.quantity})`,
      })
      .from(substances)
      .groupBy(substances.zoneId, substances.hazardClass);

    return rows.map((row) => ({ ...row, totalQuantity: Number(row.totalQuantity) }));
  },
};
