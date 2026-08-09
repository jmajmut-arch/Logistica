import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { supabase } from '@/data/supabase/client';
import { PALETTE } from '@/theme';

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          Error al conectar con la base de datos
        </Text>
        <Text variant="bodySmall" style={styles.errorMessage}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
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
    backgroundColor: PALETTE.background,
  },
  errorTitle: {
    color: PALETTE.text,
  },
  errorMessage: {
    textAlign: 'center',
    color: PALETTE.textMuted,
  },
});
