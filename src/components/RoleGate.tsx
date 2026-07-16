import type { PropsWithChildren, ReactElement } from 'react';

import { useSessionStore } from '@/store/sessionStore';
import { getPermissions, type Permissions } from '@/utils/permissions';

interface RoleGateProps extends PropsWithChildren {
  permission: keyof Permissions;
  fallback?: ReactElement | null;
}

/** Oculta (o reemplaza por `fallback`) sus hijos si el usuario activo no tiene el permiso pedido. */
export function RoleGate({ permission, fallback = null, children }: RoleGateProps) {
  const role = useSessionStore((state) => state.currentUser?.role);
  const allowed = role !== undefined && getPermissions(role)[permission];
  return allowed ? children : fallback;
}
