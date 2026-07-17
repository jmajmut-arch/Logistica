import { desc, eq, sql } from 'drizzle-orm';

import { db } from '@/data/db/client';
import { fieldVerificationItems, fieldVerifications } from '@/data/db/schema';
import type {
  FieldVerification,
  FieldVerificationItem,
  NewFieldVerification,
} from '@/domain/entities/FieldVerification';

export interface ZoneLatestVerification {
  zoneId: number;
  performedAt: number;
}

export const fieldVerificationRepository = {
  async findAll(): Promise<FieldVerification[]> {
    return db.select().from(fieldVerifications).orderBy(desc(fieldVerifications.performedAt));
  },

  async findByZone(zoneId: number): Promise<FieldVerification[]> {
    return db
      .select()
      .from(fieldVerifications)
      .where(eq(fieldVerifications.zoneId, zoneId))
      .orderBy(desc(fieldVerifications.performedAt));
  },

  async findItems(verificationId: number): Promise<FieldVerificationItem[]> {
    return db
      .select()
      .from(fieldVerificationItems)
      .where(eq(fieldVerificationItems.verificationId, verificationId));
  },

  async findAllItems(): Promise<FieldVerificationItem[]> {
    return db.select().from(fieldVerificationItems);
  },

  /** Última fecha de verificación por zona — base de la regla de atraso (ver verificationRules.ts). */
  async findLatestByZone(): Promise<ZoneLatestVerification[]> {
    const rows = await db
      .select({
        zoneId: fieldVerifications.zoneId,
        performedAt: sql<number>`max(${fieldVerifications.performedAt})`,
      })
      .from(fieldVerifications)
      .groupBy(fieldVerifications.zoneId);

    return rows.map((row) => ({ ...row, performedAt: Number(row.performedAt) }));
  },

  async create(input: NewFieldVerification): Promise<FieldVerification> {
    const [created] = await db
      .insert(fieldVerifications)
      .values({ zoneId: input.zoneId, performedBy: input.performedBy, notes: input.notes })
      .returning();

    await db.insert(fieldVerificationItems).values(
      input.items.map((item) => ({
        verificationId: created.id,
        itemKey: item.itemKey,
        result: item.result,
        observation: item.observation,
      })),
    );

    return created;
  },
};
