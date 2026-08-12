import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { PALETTES, type Palette, type ThemeId } from '@/theme';

interface ThemeState {
  themeId: ThemeId;
  setThemeId: (themeId: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'dark',
      setThemeId: (themeId) => set({ themeId }),
    }),
    {
      name: 'suspel-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** true una vez que el tema persistido (si existe) terminó de leerse de disco — evita un
 * flash del tema por defecto antes de restaurar el elegido. */
export function useThemeHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useThemeStore.persist.hasHydrated());

  useEffect(() => useThemeStore.persist.onFinishHydration(() => setHydrated(true)), []);

  return hydrated;
}

/** Paleta en uso ahora mismo, ya resuelta desde el themeId elegido — lo que consume el
 * resto de la app en vez del store crudo. */
export function useAppPalette(): Palette {
  return useThemeStore((state) => PALETTES[state.themeId]);
}
