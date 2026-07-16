import { eq } from 'drizzle-orm';

import { db } from '@/data/db/client';
import { alerts } from '@/data/db/schema';
import type { Alert } from '@/domain/entities/Alert';
import type { AlertSeverity, AlertStatus } from '@/types/enums';

export type NewAlert = Omit<Alert, 'id' | 'createdAt' | 'resolvedAt' | 'resolvedBy'>;

export const alertRepository = {
  async findAll(): Promise<Alert[]> {
    return db.select().from(alerts);
  },

  async findByStatus(status: AlertStatus): Promise<Alert[]> {
    return db.select().from(alerts).where(eq(alerts.status, status));
  },

  async create(input: NewAlert): Promise<Alert> {
    const [created] = await db
      .insert(alerts)
      .values({ ...input, createdAt: Date.now() })
      .returning();
    return created;
  },

  async updateContent(
    id: number,
    content: { severity: AlertSeverity; message: string },
  ): Promise<Alert> {
    const [updated] = await db.update(alerts).set(content).where(eq(alerts.id, id)).returning();
    return updated;
  },

  /** resolvedBy null indica que el sistema la resolvió automáticamente (ya no aplica), no una persona. */
  async resolve(id: number, resolvedBy: number | null): Promise<Alert> {
    const [updated] = await db
      .update(alerts)
      .set({ status: 'resolved', resolvedAt: Date.now(), resolvedBy })
      .where(eq(alerts.id, id))
      .returning();
    return updated;
  },

  async deleteAll(): Promise<void> {
    await db.delete(alerts);
  },
};
