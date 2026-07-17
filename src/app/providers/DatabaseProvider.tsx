import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { db } from '@/data/db/client';
import { runMigrationsAsync } from '@/data/db/migrate';
import { seedDatabaseIfEmpty } from '@/data/seed/seedData';

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    runMigrationsAsync()
      .then(() => seedDatabaseIfEmpty(db))
      .then(() => setReady(true))
      .catch((err: Error) => setError(err));
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Error al inicializar la base de datos</Text>
        <Text variant="bodySmall" style={styles.errorMessage}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
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
    opacity: 0.7,
  },
});
