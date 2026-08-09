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
  Text,
} from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import { carrierRepository } from '@/data/repositories/carrierRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { CarriersStackParamList } from './CarriersStack';

type Navigation = NativeStackNavigationProp<CarriersStackParamList, 'CarrierList'>;

export function CarrierListScreen() {
  const navigation = useNavigation<Navigation>();
  const [carriers, setCarriers] = useState<Carrier[] | null>(null);
  const [carrierToDelete, setCarrierToDelete] = useState<Carrier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setCarriers(await carrierRepository.findAll());
  }, []);

  useFocusRefresh(loadData);

  const confirmDelete = async () => {
    if (!carrierToDelete) {
      return;
    }
    setDeleting(true);
    try {
      await carrierRepository.delete(carrierToDelete.id);
      setCarrierToDelete(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  if (carriers === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={carriers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={carriers.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<Text style={styles.empty}>No hay empresas registradas.</Text>}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            left={(props) => <List.Icon {...props} icon="domain" />}
            right={() => (
              <RoleGate permission="managePlan">
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil-outline"
                    onPress={() => navigation.navigate('CarrierForm', { carrierId: item.id })}
                  />
                  <IconButton icon="delete-outline" onPress={() => setCarrierToDelete(item)} />
                </View>
              </RoleGate>
            )}
          />
        )}
      />
      <RoleGate permission="managePlan">
        <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('CarrierForm')} />
      </RoleGate>

      <Portal>
        <Dialog visible={carrierToDelete !== null} onDismiss={() => setCarrierToDelete(null)}>
          <Dialog.Title>Eliminar empresa</Dialog.Title>
          <Dialog.Content>
            <Text>Esta acción no se puede deshacer.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCarrierToDelete(null)}>Cancelar</Button>
            <Button onPress={confirmDelete} loading={deleting} disabled={deleting}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  empty: {
    textAlign: 'center',
    opacity: 0.7,
    padding: 24,
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
