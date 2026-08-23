import type { Role } from '@/types/enums';

export interface User {
  id: number;
  name: string;
  role: Role;
  /** Solo se usa para notificarle por correo (ej. incidencias de guías de despacho). */
  email: string | null;
}

export type NewUser = Omit<User, 'id'>;
