import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/domain/entities/User';

interface SessionState {
  currentUser: User | null;
  currentSiteId: number | null;
  login: (user: User, siteId?: number | null) => void;
  setSite: (siteId: number | null) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentUser: null,
      currentSiteId: null,
      login: (user, siteId = null) => set({ currentUser: user, currentSiteId: siteId }),
      setSite: (siteId) => set({ currentSiteId: siteId }),
      logout: () => set({ currentUser: null, currentSiteId: null }),
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
