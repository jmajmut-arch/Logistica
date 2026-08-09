import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
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

import { EmptyState } from '@/components/EmptyState';
import { RoleGate } from '@/components/RoleGate';
import { carrierRepository } from '@/data/repositories/carrierRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import { userRepository } from '@/data/repositories/userRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import type { User } from '@/domain/entities/User';
import { getWeekNumber } from '@/utils/timeBlocks';
import { OPERATION_TYPE_LABELS } from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { TransportPlanStackParamList } from './TransportPlanStack';

type Navigation = NativeStackNavigationProp<TransportPlanStackParamList, 'TransportPlanList'>;

export function TransportPlanListScreen() {
  const navigation = useNavigation<Navigation>();
  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [usersById, setUsersById] = useState<Map<number, User>>(new Map());
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [carriersById, setCarriersById] = useState<Map<number, Carrier>>(new Map());
  const [itemToDelete, setItemToDelete] = useState<TransportPlanItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [items, users, sites, carriers] = await Promise.all([
      transportPlanRepository.findAll(),
      userRepository.findAll(),
      siteRepository.findAll(),
      carrierRepository.findAll(),
    ]);
    setPlanItems(items);
    setUsersById(new Map(users.map((user) => [user.id, user])));
    setSitesById(new Map(sites.map((site) => [site.id, site])));
    setCarriersById(new Map(carriers.map((carrier) => [carrier.id, carrier])));
  }, []);

  useFocusRefresh(loadData);

  const confirmDelete = async () => {
    if (!itemToDelete) {
      return;
    }
    setDeleting(true);
    try {
      await transportPlanRepository.delete(itemToDelete.id);
      setItemToDelete(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  const describe = useMemo(
    () => (item: TransportPlanItem) => {
      const site = sitesById.get(item.siteId);
      const parts = [
        `Semana ${getWeekNumber(item.scheduledAt)}`,
        format(new Date(item.scheduledAt), 'dd-MM-yyyy HH:mm'),
      ];
      parts.push(site ? site.name : `Sitio #${item.siteId}`);
      if (item.carrierId !== null) {
        const carrier = carriersById.get(item.carrierId);
        if (carrier) {
          parts.push(carrier.name);
        }
      }
      const creator = usersById.get(item.createdBy);
      parts.push(
        `Ingresado por ${creator ? creator.name : `#${item.createdBy}`} el ${format(
          new Date(item.createdAt),
          'dd-MM-yyyy HH:mm',
        )}`,
      );
      return parts.join(' · ');
    },
    [usersById, sitesById, carriersById],
  );

  if (planItems === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={planItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={planItems.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-blank-outline"
            message="No hay items en el plan de transporte todavía."
          />
        }
        renderItem={({ item }) => (
          <List.Item
            title={OPERATION_TYPE_LABELS[item.operationType]}
            description={describe(item)}
            descriptionNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon="calendar-clock-outline" />}
            onPress={() => navigation.navigate('TransportPlanForm', { planItemId: item.id })}
            right={() => (
              <RoleGate permission="managePlan">
                <IconButton icon="delete-outline" onPress={() => setItemToDelete(item)} />
              </RoleGate>
            )}
          />
        )}
      />
      <RoleGate permission="managePlan">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('TransportPlanForm')}
        />
      </RoleGate>

      <Portal>
        <Dialog visible={itemToDelete !== null} onDismiss={() => setItemToDelete(null)}>
          <Dialog.Title>Eliminar item del plan</Dialog.Title>
          <Dialog.Content>
            <Text>Esta acción no se puede deshacer.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setItemToDelete(null)}>Cancelar</Button>
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
