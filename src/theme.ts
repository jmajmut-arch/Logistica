import { DarkTheme as NavigationDarkTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';

// Paleta de la app: fondo azul-noche, acento naranja y acento celeste secundario. Usada
// en la pantalla de login y en el resto de la app vía PaperProvider / NavigationContainer
// para mantener una identidad consistente.
export const PALETTE = {
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
} as const;

export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: PALETTE.primary,
    onPrimary: PALETTE.onPrimary,
    primaryContainer: '#7c3a10',
    onPrimaryContainer: '#fed7aa',
    secondary: PALETTE.secondary,
    onSecondary: PALETTE.onSecondary,
    background: PALETTE.background,
    onBackground: PALETTE.text,
    surface: PALETTE.surface,
    onSurface: PALETTE.text,
    surfaceVariant: PALETTE.surfaceVariant,
    onSurfaceVariant: PALETTE.textMuted,
    outline: PALETTE.border,
    outlineVariant: 'rgba(255,255,255,0.08)',
    elevation: {
      level0: 'transparent',
      level1: PALETTE.surface,
      level2: '#193256',
      level3: PALETTE.surfaceVariant,
      level4: '#1e3a63',
      level5: '#20406b',
    },
  },
};

export const navigationTheme: NavigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: PALETTE.primary,
    background: PALETTE.background,
    card: PALETTE.surface,
    text: PALETTE.text,
    border: PALETTE.border,
    notification: PALETTE.primary,
  },
};
