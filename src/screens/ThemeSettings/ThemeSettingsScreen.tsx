import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAppPalette, useThemeStore } from '@/store/themeStore';
import { PALETTES, THEME_LABELS, type ThemeId } from '@/theme';

const THEME_ORDER: ThemeId[] = ['light', 'dark', 'emerald'];

const THEME_DESCRIPTIONS: Record<ThemeId, string> = {
  light: 'Fondos claros, texto oscuro — ideal con mucha luz ambiente.',
  dark: 'El tema original de la app: fondo azul-noche con acentos naranja y celeste.',
  emerald: 'Verde esmeralda profundo con acento dorado, para un look distinto y cálido.',
};

export function ThemeSettingsScreen() {
  const themeId = useThemeStore((state) => state.themeId);
  const setThemeId = useThemeStore((state) => state.setThemeId);
  const PALETTE = useAppPalette();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleMedium" style={[styles.intro, { color: PALETTE.textMuted }]}>
        Elige la paleta de colores de la app. Se aplica de inmediato a todos los perfiles.
      </Text>

      {THEME_ORDER.map((id) => {
        const preview = PALETTES[id];
        const selected = id === themeId;
        return (
          <Card
            key={id}
            style={[
              styles.card,
              { backgroundColor: PALETTE.surface, borderColor: selected ? PALETTE.primary : 'transparent' },
            ]}
            onPress={() => setThemeId(id)}
          >
            <Card.Content style={styles.cardContent}>
              <View style={[styles.swatchRow, { backgroundColor: preview.background }]}>
                <View style={[styles.swatch, { backgroundColor: preview.surface }]} />
                <View style={[styles.swatch, { backgroundColor: preview.primary }]} />
                <View style={[styles.swatch, { backgroundColor: preview.secondary }]} />
              </View>
              <View style={styles.textColumn}>
                <Text variant="titleMedium" style={{ color: PALETTE.text }}>
                  {THEME_LABELS[id]}
                </Text>
                <Text variant="bodySmall" style={{ color: PALETTE.textMuted }}>
                  {THEME_DESCRIPTIONS[id]}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={selected ? 'check-circle' : 'circle-outline'}
                size={26}
                color={selected ? PALETTE.primary : PALETTE.textMuted}
              />
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  intro: {
    marginBottom: 4,
  },
  card: {
    borderWidth: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 10,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
});
