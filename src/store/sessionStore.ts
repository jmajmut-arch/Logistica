import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/domain/entities/User';
import type { OperatorScope } from '@/types/enums';

interface SessionState {
  currentUser: User | null;
  currentSiteId: number | null;
  currentOperatorScope: OperatorScope | null;
  login: (user: User, siteId?: number | null, operatorScope?: OperatorScope | null) => void;
  setSite: (siteId: number | null) => void;
  setOperatorScope: (scope: OperatorScope | null) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      currentUser: null,
      currentSiteId: null,
      currentOperatorScope: null,
      login: (user, siteId = null, operatorScope = null) =>
        set({ currentUser: user, currentSiteId: siteId, currentOperatorScope: operatorScope }),
      setSite: (siteId) => set({ currentSiteId: siteId }),
      setOperatorScope: (scope) => set({ currentOperatorScope: scope }),
      logout: () => set({ currentUser: null, currentSiteId: null, currentOperatorScope: null }),
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
