import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { db } from '@/data/db/client';
import migrations from '@/data/db/migrations/migrations';
import { seedDatabaseIfEmpty } from '@/data/seed/seedData';

export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success: migrationsSuccess, error: migrationError } = useMigrations(db, migrations);
  const [seedError, setSeedError] = useState<Error | null>(null);
  const [seedDone, setSeedDone] = useState(false);

  useEffect(() => {
    if (!migrationsSuccess) {
      return;
    }
    seedDatabaseIfEmpty(db)
      .then(() => setSeedDone(true))
      .catch((error: Error) => setSeedError(error));
  }, [migrationsSuccess]);

  const error = migrationError ?? seedError;
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

  if (!migrationsSuccess || !seedDone) {
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
