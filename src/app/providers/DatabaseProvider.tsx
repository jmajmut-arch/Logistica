import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { supabase } from '@/data/supabase/client';
import { loadThemeFromServer, useAppPalette } from '@/store/themeStore';

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const PALETTE = useAppPalette();

  useEffect(() => {
    // El esquema y los datos de ejemplo viven en Supabase (ver supabase/schema.sql) —
    // acá solo se confirma que el proyecto responde antes de renderizar el resto de la
    // app, para mostrar un error claro si falta configurar las credenciales o el
    // esquema todavía no se corrió.
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .then(({ error: queryError }) => {
        if (queryError) {
          setError(new Error(queryError.message));
        } else {
          setReady(true);
        }
      });
    // No bloquea el arranque: si falla, este dispositivo simplemente sigue con el último
    // tema que ya tenía (local o el default), y se sincroniza en el próximo inicio.
    loadThemeFromServer().catch(() => {});
  }, []);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: PALETTE.background }]}>
        <Text variant="titleMedium" style={{ color: PALETTE.text }}>
          Error al conectar con la base de datos
        </Text>
        <Text variant="bodySmall" style={[styles.errorMessage, { color: PALETTE.textMuted }]}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: PALETTE.background }]}>
        <ActivityIndicator size="large" color={PALETTE.primary} />
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  errorMessage: {
    textAlign: 'center',
  },
});
