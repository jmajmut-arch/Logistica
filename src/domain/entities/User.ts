import type { Role } from '@/types/enums';

export interface User {
  id: number;
  name: string;
  role: Role;
}

export type NewUser = Omit<User, 'id'>;
