import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useSessionStore } from '@/store/sessionStore';
import type { Role } from '@/types/enums';

const DEMO_ROLES: { role: Role; label: string }[] = [
  { role: 'warehouse', label: 'Bodega' },
  { role: 'supervisor', label: 'Supervisor' },
  { role: 'hse', label: 'HSE' },
];

// TODO(Fase 3): reemplazar por selección real de usuario (seed local) + persistencia de sesión.
export function LoginScreen() {
  const login = useSessionStore((state) => state.login);

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        SUSPEL
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Selecciona un rol para continuar
      </Text>
      {DEMO_ROLES.map(({ role, label }) => (
        <Button
          key={role}
          mode="contained"
          style={styles.button}
          onPress={() => login({ id: role, name: label, role })}
        >
          {label}
        </Button>
      ))}
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
