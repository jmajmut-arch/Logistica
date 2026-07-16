import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/domain/entities/User';

interface SessionState {
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentUser: null,
      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
    }),
    {
      name: 'suspel-session',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * true una vez que la sesión persistida (si existe) terminó de leerse de disco.
 * Evita que RootNavigator muestre Login por un instante antes de restaurar el rol activo.
 */
export function useSessionHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSessionStore.persist.hasHydrated());

  useEffect(() => useSessionStore.persist.onFinishHydration(() => setHydrated(true)), []);

  return hydrated;
}
