import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { userRepository } from '@/data/repositories/userRepository';
import type { User } from '@/domain/entities/User';
import { useSessionStore } from '@/store/sessionStore';

const ROLE_LABELS: Record<User['role'], string> = {
  warehouse: 'Bodega',
  supervisor: 'Supervisor',
  hse: 'HSE',
};

// TODO(Fase 3): reemplazar por un flujo de login real; hoy solo lista los usuarios
// sembrados en seedData.ts y persiste la sesión únicamente en memoria.
export function LoginScreen() {
  const login = useSessionStore((state) => state.login);
  const [demoUsers, setDemoUsers] = useState<User[] | null>(null);

  useEffect(() => {
    userRepository.findAll().then(setDemoUsers);
  }, []);

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        SUSPEL
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Selecciona un usuario para continuar
      </Text>
      {demoUsers === null ? (
        <ActivityIndicator />
      ) : (
        demoUsers.map((user) => (
          <Button key={user.id} mode="contained" style={styles.button} onPress={() => login(user)}>
            {user.name} ({ROLE_LABELS[user.role]})
          </Button>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 16,
    opacity: 0.7,
  },
  button: {
    width: '100%',
  },
});
