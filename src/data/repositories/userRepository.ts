import { eq } from 'drizzle-orm';

import { db } from '@/data/db/client';
import { users } from '@/data/db/schema';
import type { User } from '@/domain/entities/User';

export const userRepository = {
  async findAll(): Promise<User[]> {
    return db.select().from(users);
  },

  async findById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },
};
