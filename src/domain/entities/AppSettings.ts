import type { ThemeId } from '@/theme';

/** Fila única (id fijo en 1) con configuración compartida por toda la organización — hoy
 * solo el tema de colores, para que el mismo look se vea en cualquier dispositivo o sesión,
 * sin importar el perfil que haya iniciado sesión. */
export interface AppSettings {
  id: number;
  themeId: ThemeId;
  updatedAt: number;
}
