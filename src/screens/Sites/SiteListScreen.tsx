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
import { siteRepository } from '@/data/repositories/siteRepository';
import type { Site } from '@/domain/entities/Site';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { SitesStackParamList } from './SitesStack';

type Navigation = NativeStackNavigationProp<SitesStackParamList, 'SiteList'>;

function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23503';
}

export function SiteListScreen() {
  const navigation = useNavigation<Navigation>();
  const [sites, setSites] = useState<Site[] | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setSites(await siteRepository.findAll());
  }, []);

  useFocusRefresh(loadData);

  const confirmDelete = async () => {
    if (!siteToDelete) {
      return;
    }
    setDeleting(true);
    try {
      await siteRepository.delete(siteToDelete.id);
      setSiteToDelete(null);
      await loadData();
    } catch (error) {
      setErrorMessage(
        isForeignKeyViolation(error)
          ? 'No se puede eliminar: este sitio tiene items del plan o llegadas asociadas.'
          : 'No se pudo eliminar el sitio.',
      );
    } finally {
      setDeleting(false);
    }
  };

  if (sites === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sites}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={sites.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <EmptyState icon="warehouse" message="No hay patios ni bodegas registrados." />
        }
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={SITE_TYPE_LABELS[item.type]}
            left={(props) => (
              <List.Icon {...props} icon={item.type === 'patio' ? 'texture-box' : 'warehouse'} />
            )}
            right={() => (
              <RoleGate permission="manageCatalog">
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil-outline"
                    onPress={() => navigation.navigate('SiteForm', { siteId: item.id })}
                  />
                  <IconButton icon="delete-outline" onPress={() => setSiteToDelete(item)} />
                </View>
              </RoleGate>
            )}
          />
        )}
      />
      <RoleGate permission="manageCatalog">
        <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('SiteForm')} />
      </RoleGate>

      <Portal>
        <Dialog visible={siteToDelete !== null} onDismiss={() => setSiteToDelete(null)}>
          <Dialog.Title>Eliminar sitio</Dialog.Title>
          <Dialog.Content>
            <Text>
              ¿Eliminar &quot;{siteToDelete?.name}&quot;? Esta acción no se puede deshacer.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSiteToDelete(null)}>Cancelar</Button>
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
