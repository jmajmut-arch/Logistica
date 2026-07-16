import { create } from 'zustand';

import type { User } from '@/domain/entities/User';

interface SessionState {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
}

// TODO(Fase 3): persistir la sesión localmente (zustand/persist + storage)
// para no perder el rol activo al reabrir la app.
export const useSessionStore = create<SessionState>((set) => ({
  currentUser: null,
  login: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: null }),
}));
