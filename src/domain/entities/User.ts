import type { Role } from '@/types/enums';

export interface User {
  id: string;
  name: string;
  role: Role;
}
