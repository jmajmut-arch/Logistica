import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';

import { PlanItemStatusBadge } from '@/components/PlanItemStatusBadge';
import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { getPlanItemStatus, type PlanItemStatus } from '@/domain/rules/complianceStatus';
import { OPERATION_TYPE_LABELS, PLAN_ITEM_STATUS_LABELS } from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

const STATUS_ORDER: PlanItemStatus[] = ['late', 'pending', 'early', 'on_time'];

export function DashboardScreen() {
  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [arrivals, setArrivals] = useState<LoadArrival[]>([]);
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());

  const loadData = useCallback(async () => {
    const [items, loadedArrivals, sites] = await Promise.all([
      transportPlanRepository.findAll(),
      loadArrivalRepository.findAll(),
      siteRepository.findAll(),
    ]);
    setPlanItems(items);
    setArrivals(loadedArrivals);
    setSitesById(new Map(sites.map((site) => [site.id, site])));
  }, []);

  useFocusRefresh(loadData);

  const arrivalsByPlanItem = useMemo(() => {
    const map = new Map<number, LoadArrival>();
    for (const arrival of arrivals) {
      if (arrival.planItemId !== null) {
        map.set(arrival.planItemId, arrival);
      }
    }
    return map;
  }, [arrivals]);

  const unmatchedArrivals = useMemo(
    () => arrivals.filter((arrival) => arrival.planItemId === null),
    [arrivals],
  );

  const statusCounts = useMemo(() => {
    const counts = new Map<PlanItemStatus, number>();
    for (const item of planItems ?? []) {
      const status = getPlanItemStatus(item, arrivalsByPlanItem.get(item.id));
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return counts;
  }, [planItems, arrivalsByPlanItem]);

  const siteName = useCallback(
    (siteId: number) => sitesById.get(siteId)?.name ?? `Sitio #${siteId}`,
    [sitesById],
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
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Cumplimiento del plan de transporte
      </Text>
      <View style={styles.grid}>
        {STATUS_ORDER.map((status) => (
          <Card key={status} style={styles.tile}>
            <Card.Content>
              <Text variant="displaySmall">{statusCounts.get(status) ?? 0}</Text>
              <Text variant="labelMedium">{PLAN_ITEM_STATUS_LABELS[status]}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Plan vs. llegada real
      </Text>
      <FlatList
        style={styles.list}
        data={planItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, planItems.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay items en el plan de transporte todavía.</Text>
        }
        renderItem={({ item }) => {
          const arrival = arrivalsByPlanItem.get(item.id);
          const parts = [
            `Planificado ${format(new Date(item.scheduledAt), 'dd-MM-yyyy HH:mm')}`,
            siteName(item.siteId),
          ];
          if (arrival) {
            parts.push(`Llegó ${format(new Date(arrival.arrivedAt), 'HH:mm')}`);
          }
          return (
            <Card style={styles.itemCard}>
              <Card.Content style={styles.itemContent}>
                <View style={styles.itemText}>
                  <Text variant="bodyMedium">{OPERATION_TYPE_LABELS[item.operationType]}</Text>
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    {parts.join(' · ')}
                  </Text>
                </View>
                <PlanItemStatusBadge status={getPlanItemStatus(item, arrival)} />
              </Card.Content>
            </Card>
          );
        }}
        ListFooterComponent={
          unmatchedArrivals.length === 0 ? null : (
            <View>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Llegadas sin plan asociado
              </Text>
              {unmatchedArrivals.map((arrival) => (
                <Card key={arrival.id} style={styles.itemCard}>
                  <Card.Content>
                    <Text variant="bodyMedium">{siteName(arrival.siteId)}</Text>
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      Llegó {format(new Date(arrival.arrivedAt), 'dd-MM-yyyy HH:mm')}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  tile: {
    minWidth: 120,
    flexGrow: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
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
  itemCard: {
    marginBottom: 4,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemText: {
    flex: 1,
  },
  itemDescription: {
    opacity: 0.7,
    marginTop: 2,
  },
});
