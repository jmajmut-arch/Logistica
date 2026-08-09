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
import { PlanItemStatusBadge } from '@/components/PlanItemStatusBadge';
import { RoleGate } from '@/components/RoleGate';
import { carrierRepository } from '@/data/repositories/carrierRepository';
import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { getPlanItemStatus } from '@/domain/rules/complianceStatus';
import { OPERATION_TYPE_LABELS } from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { LoadArrivalsStackParamList } from './LoadArrivalsStack';

type Navigation = NativeStackNavigationProp<LoadArrivalsStackParamList, 'LoadArrivalList'>;

export function LoadArrivalListScreen() {
  const navigation = useNavigation<Navigation>();
  const [arrivals, setArrivals] = useState<LoadArrival[] | null>(null);
  const [planItemsById, setPlanItemsById] = useState<Map<number, TransportPlanItem>>(new Map());
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [carriersById, setCarriersById] = useState<Map<number, Carrier>>(new Map());
  const [arrivalToDelete, setArrivalToDelete] = useState<LoadArrival | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [loadedArrivals, planItems, sites, carriers] = await Promise.all([
      loadArrivalRepository.findAll(),
      transportPlanRepository.findAll(),
      siteRepository.findAll(),
      carrierRepository.findAll(),
    ]);
    setArrivals(loadedArrivals);
    setPlanItemsById(new Map(planItems.map((item) => [item.id, item])));
    setSitesById(new Map(sites.map((site) => [site.id, site])));
    setCarriersById(new Map(carriers.map((carrier) => [carrier.id, carrier])));
  }, []);

  useFocusRefresh(loadData);

  const confirmDelete = async () => {
    if (!arrivalToDelete) {
      return;
    }
    setDeleting(true);
    try {
      await loadArrivalRepository.delete(arrivalToDelete.id);
      setArrivalToDelete(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  const describe = useMemo(
    () => (arrival: LoadArrival, planItem: TransportPlanItem | undefined) => {
      const site = sitesById.get(arrival.siteId);
      const parts = [`Llegó ${format(new Date(arrival.arrivedAt), 'dd-MM-yyyy HH:mm')}`];
      parts.push(site ? site.name : `Sitio #${arrival.siteId}`);
      if (arrival.carrierId !== null) {
        const carrier = carriersById.get(arrival.carrierId);
        if (carrier) {
          parts.push(carrier.name);
        }
      }
      if (planItem) {
        parts.push(`Planificado ${format(new Date(planItem.scheduledAt), 'HH:mm')}`);
      }
      return parts.join(' · ');
    },
    [sitesById, carriersById],
  );

  if (arrivals === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={arrivals}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={arrivals.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <EmptyState icon="package-variant-closed" message="No hay llegadas de carga registradas." />
        }
        renderItem={({ item }) => {
          const planItem = item.planItemId !== null ? planItemsById.get(item.planItemId) : undefined;
          return (
            <List.Item
              title={planItem ? OPERATION_TYPE_LABELS[planItem.operationType] : 'Viaje no planificado'}
              description={describe(item, planItem)}
              left={(props) => <List.Icon {...props} icon="package-variant-closed" />}
              onPress={() => navigation.navigate('LoadArrivalForm', { arrivalId: item.id })}
              right={() => (
                <View style={styles.rightActions}>
                  {planItem && <PlanItemStatusBadge status={getPlanItemStatus(planItem, item)} />}
                  <RoleGate permission="registerArrivals">
                    <IconButton icon="delete-outline" onPress={() => setArrivalToDelete(item)} />
                  </RoleGate>
                </View>
              )}
            />
          );
        }}
      />
      <RoleGate permission="registerArrivals">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('LoadArrivalForm')}
        />
      </RoleGate>

      <Portal>
        <Dialog visible={arrivalToDelete !== null} onDismiss={() => setArrivalToDelete(null)}>
          <Dialog.Title>Eliminar llegada</Dialog.Title>
          <Dialog.Content>
            <Text>Esta acción no se puede deshacer.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setArrivalToDelete(null)}>Cancelar</Button>
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
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
