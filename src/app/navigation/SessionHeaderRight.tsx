import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useSessionStore } from '@/store/sessionStore';
import { PALETTE } from '@/theme';
import type { Role } from '@/types/enums';

const ROLE_LABELS: Record<Role, string> = {
  warehouse: 'Bodega',
  supervisor: 'Supervisor',
};

export function SessionHeaderRight() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const logout = useSessionStore((state) => state.logout);

  if (!currentUser) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" numberOfLines={1} style={styles.roleLabel}>
        {ROLE_LABELS[currentUser.role]}
      </Text>
      <Pressable
        onPress={logout}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <MaterialCommunityIcons name="logout" size={22} color={PALETTE.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 16,
  },
  roleLabel: {
    opacity: 0.7,
  },
});
