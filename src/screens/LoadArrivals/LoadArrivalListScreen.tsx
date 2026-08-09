import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, List, Text } from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import { PlanItemStatusBadge } from '@/components/PlanItemStatusBadge';
import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
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

  const loadData = useCallback(async () => {
    const [loadedArrivals, planItems] = await Promise.all([
      loadArrivalRepository.findAll(),
      transportPlanRepository.findAll(),
    ]);
    setArrivals(loadedArrivals);
    setPlanItemsById(new Map(planItems.map((item) => [item.id, item])));
  }, []);

  useFocusRefresh(loadData);

  const describe = useMemo(
    () => (arrival: LoadArrival, planItem: TransportPlanItem | undefined) => {
      const parts = [`Llegó ${format(new Date(arrival.arrivedAt), 'dd-MM-yyyy HH:mm')}`];
      parts.push(arrival.location);
      if (planItem) {
        parts.push(`Planificado ${format(new Date(planItem.scheduledAt), 'dd-MM-yyyy HH:mm')}`);
      }
      return parts.join(' · ');
    },
    [],
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
          <Text style={styles.empty}>No hay llegadas de carga registradas.</Text>
        }
        renderItem={({ item }) => {
          const planItem = planItemsById.get(item.planItemId);
          return (
            <List.Item
              title={planItem ? OPERATION_TYPE_LABELS[planItem.operationType] : 'Sin plan asociado'}
              description={describe(item, planItem)}
              left={(props) => <List.Icon {...props} icon="package-variant-closed" />}
              right={() =>
                planItem ? (
                  <PlanItemStatusBadge status={getPlanItemStatus(planItem, item)} />
                ) : null
              }
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
