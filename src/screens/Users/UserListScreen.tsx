import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Snackbar,
  Text,
} from 'react-native-paper';

import { EmptyState } from '@/components/EmptyState';
import { RoleGate } from '@/components/RoleGate';
import { userRepository } from '@/data/repositories/userRepository';
import type { User } from '@/domain/entities/User';
import { useSessionStore } from '@/store/sessionStore';
import { useFocusRefresh } from '@/utils/useFocusRefresh';
import { ROLE_ICONS, ROLE_LABELS } from '@/utils/userDisplay';

import type { UsersStackParamList } from './UsersStack';

type Navigation = NativeStackNavigationProp<UsersStackParamList, 'UserList'>;

function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23503';
}

export function UserListScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);
  const [users, setUsers] = useState<User[] | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setUsers(await userRepository.findAll());
  }, []);

  useFocusRefresh(loadData);

  const confirmDelete = async () => {
    if (!userToDelete) {
      return;
    }
    setDeleting(true);
    try {
      await userRepository.delete(userToDelete.id);
      setUserToDelete(null);
      await loadData();
    } catch (error) {
      setErrorMessage(
        isForeignKeyViolation(error)
          ? 'No se puede eliminar: esta persona tiene planificación o llegadas registradas a su nombre.'
          : 'No se pudo eliminar la persona.',
      );
    } finally {
      setDeleting(false);
    }
  };

  if (users === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={users.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<EmptyState icon="account-group-outline" message="No hay personas registradas." />}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={ROLE_LABELS[item.role]}
            left={(props) => <List.Icon {...props} icon={ROLE_ICONS[item.role]} />}
            right={() => (
              <RoleGate permission="manageCatalog">
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil-outline"
                    onPress={() => navigation.navigate('UserForm', { userId: item.id })}
                  />
                  <IconButton
                    icon="delete-outline"
                    disabled={item.id === currentUser?.id}
                    onPress={() => setUserToDelete(item)}
                  />
                </View>
              </RoleGate>
            )}
          />
        )}
      />
      <RoleGate permission="manageCatalog">
        <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('UserForm')} />
      </RoleGate>

      <Portal>
        <Dialog visible={userToDelete !== null} onDismiss={() => setUserToDelete(null)}>
          <Dialog.Title>Eliminar persona</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Eliminar &quot;{userToDelete?.name}&quot;? Esta acción no se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUserToDelete(null)}>Cancelar</Button>
            <Button onPress={confirmDelete} loading={deleting} disabled={deleting}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={errorMessage !== null} onDismiss={() => setErrorMessage(null)} duration={4000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
