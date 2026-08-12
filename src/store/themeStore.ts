import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appSettingsRepository } from '@/data/repositories/appSettingsRepository';
import { PALETTES, type Palette, type ThemeId } from '@/theme';

interface ThemeState {
  themeId: ThemeId;
  /** Elegido por la persona usando la app ahora: guarda local (para que se sienta
   * instantáneo) y en Supabase (para que se vea igual en cualquier dispositivo o perfil). */
  setThemeId: (themeId: ThemeId) => void;
  /** Solo actualiza el estado local, sin volver a escribir en Supabase — para cuando el
   * valor ya viene de ahí (ver loadThemeFromServer). */
  hydrateFromServer: (themeId: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'dark',
      setThemeId: (themeId) => {
        set({ themeId });
        appSettingsRepository.setThemeId(themeId).catch(() => {
          // El local ya quedó aplicado — si falla la sincronización, este dispositivo sigue
          // viendo el tema elegido; solo no se propaga a los demás hasta el próximo cambio.
        });
      },
      hydrateFromServer: (themeId) => set({ themeId }),
    }),
    {
      name: 'suspel-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** true una vez que el tema persistido localmente (si existe) terminó de leerse de disco —
 * evita un flash del tema por defecto antes de restaurar el último conocido, mientras se
 * espera la respuesta de Supabase. */
export function useThemeHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useThemeStore.persist.hasHydrated());

  useEffect(() => useThemeStore.persist.onFinishHydration(() => setHydrated(true)), []);

  return hydrated;
}

/** Trae el tema activo compartido desde Supabase y lo aplica localmente — se llama una vez
 * al iniciar la app (ver DatabaseProvider) para que todos los dispositivos/perfiles
 * converjan al mismo tema, en vez de quedarse cada uno con su propia elección vieja. */
export async function loadThemeFromServer(): Promise<void> {
  const settings = await appSettingsRepository.get();
  useThemeStore.getState().hydrateFromServer(settings.themeId);
}

/** Paleta en uso ahora mismo, ya resuelta desde el themeId elegido — lo que consume el
 * resto de la app en vez del store crudo. */
export function useAppPalette(): Palette {
  return useThemeStore((state) => PALETTES[state.themeId]);
}
