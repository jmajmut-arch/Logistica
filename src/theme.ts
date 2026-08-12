import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

export interface Palette {
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  text: string;
  textMuted: string;
  border: string;
  /** Íconos claros sobre fondo oscuro, u oscuros sobre fondo claro. */
  statusBarStyle: 'light' | 'dark';
}

export type ThemeId = 'dark' | 'light' | 'emerald';

export const THEME_LABELS: Record<ThemeId, string> = {
  dark: 'Oscuro',
  light: 'Claro',
  emerald: 'Esmeralda',
};

// Fondo azul-noche, acento naranja y acento celeste secundario. Es la que existía antes de
// que la app tuviera selector de tema, así que queda como default para no sorprender a
// nadie que ya la esté usando.
const DARK: Palette = {
  background: '#0b1120',
  surface: '#132743',
  surfaceVariant: '#1b3355',
  primary: '#fb923c',
  onPrimary: '#0b1120',
  secondary: '#38bdf8',
  onSecondary: '#0b1120',
  text: '#f8fafc',
  textMuted: 'rgba(226,232,240,0.7)',
  border: 'rgba(255,255,255,0.14)',
  statusBarStyle: 'light',
};

// Misma identidad de marca (naranja + celeste) que la oscura, sobre fondos claros — los
// acentos se oscurecen un poco respecto a DARK para mantener contraste de texto sobre
// blanco (el naranja/celeste original quedan muy pálidos ahí).
const LIGHT: Palette = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceVariant: '#eef2f7',
  primary: '#ea580c',
  onPrimary: '#fff7ed',
  secondary: '#0284c7',
  onSecondary: '#f0f9ff',
  text: '#0f172a',
  textMuted: 'rgba(15,23,42,0.65)',
  border: 'rgba(15,23,42,0.12)',
  statusBarStyle: 'dark',
};

// Verde esmeralda profundo con acento dorado — una alternativa oscura distinta a la
// azul-naranja original, pensada para quien quiera algo más cálido/premium sin pasarse a
// un tema claro.
const EMERALD: Palette = {
  background: '#0a1f1c',
  surface: '#123531',
  surfaceVariant: '#1a4a43',
  primary: '#d4a24e',
  onPrimary: '#1a1305',
  secondary: '#5eead4',
  onSecondary: '#062824',
  text: '#f0fdfa',
  textMuted: 'rgba(240,253,250,0.7)',
  border: 'rgba(255,255,255,0.14)',
  statusBarStyle: 'light',
};

export const PALETTES: Record<ThemeId, Palette> = {
  dark: DARK,
  light: LIGHT,
  emerald: EMERALD,
};

export function buildPaperTheme(palette: Palette): MD3Theme {
  const base = palette.statusBarStyle === 'dark' ? MD3LightTheme : MD3DarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      onPrimary: palette.onPrimary,
      primaryContainer: palette.surfaceVariant,
      onPrimaryContainer: palette.text,
      secondary: palette.secondary,
      onSecondary: palette.onSecondary,
      background: palette.background,
      onBackground: palette.text,
      surface: palette.surface,
      onSurface: palette.text,
      surfaceVariant: palette.surfaceVariant,
      onSurfaceVariant: palette.textMuted,
      outline: palette.border,
      outlineVariant: base.colors.outlineVariant,
      elevation: {
        level0: 'transparent',
        level1: palette.surface,
        level2: palette.surfaceVariant,
        level3: palette.surfaceVariant,
        level4: palette.surfaceVariant,
        level5: palette.surfaceVariant,
      },
    },
  };
}

export function buildNavigationTheme(palette: Palette): NavigationTheme {
  const base = palette.statusBarStyle === 'dark' ? NavigationLightTheme : NavigationDarkTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.primary,
    },
  };
}
