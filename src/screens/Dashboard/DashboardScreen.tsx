import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, ProgressBar, Text } from 'react-native-paper';

import { PlanItemStatusBadge } from '@/components/PlanItemStatusBadge';
import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import {
  getCompliancePercentage,
  getDisplayStatus,
  getPlanItemStatus,
  type DisplayStatus,
} from '@/domain/rules/complianceStatus';
import { getWeekNumber, startOfToday, startOfWeek } from '@/utils/timeBlocks';
import {
  DISPLAY_STATUS_COLORS,
  DISPLAY_STATUS_LABELS,
  getComplianceColor,
  OPERATION_TYPE_LABELS,
} from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUS_ORDER: DisplayStatus[] = ['overdue', 'late', 'pending', 'early', 'on_time'];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function arrivalDelta(scheduledAt: number, arrivedAt: number): string {
  const diffMinutes = Math.round((arrivedAt - scheduledAt) / 60_000);
  if (diffMinutes === 0) {
    return 'en punto';
  }
  return diffMinutes > 0 ? `+${diffMinutes} min` : `${diffMinutes} min`;
}

export function DashboardScreen() {
  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [arrivals, setArrivals] = useState<LoadArrival[]>([]);
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [now, setNow] = useState(() => Date.now());

  const loadData = useCallback(async () => {
    const [items, loadedArrivals, sites] = await Promise.all([
      transportPlanRepository.findAll(),
      loadArrivalRepository.findAll(),
      siteRepository.findAll(),
    ]);
    setPlanItems(items);
    setArrivals(loadedArrivals);
    setSitesById(new Map(sites.map((site) => [site.id, site])));
    setNow(Date.now());
  }, []);

  useFocusRefresh(loadData);

  const dayStart = useMemo(() => startOfToday(), []);
  const dayEnd = dayStart + DAY_MS;
  const weekStart = useMemo(() => startOfWeek(), []);
  const weekEnd = weekStart + 7 * DAY_MS;
  const weekNumber = useMemo(() => getWeekNumber(weekStart), [weekStart]);

  const arrivalsByPlanItem = useMemo(() => {
    const map = new Map<number, LoadArrival>();
    for (const arrival of arrivals) {
      if (arrival.planItemId !== null) {
        map.set(arrival.planItemId, arrival);
      }
    }
    return map;
  }, [arrivals]);

  const siteName = useCallback(
    (siteId: number) => sitesById.get(siteId)?.name ?? `Sitio #${siteId}`,
    [sitesById],
  );

  const todayItems = useMemo(
    () =>
      (planItems ?? [])
        .filter((item) => item.scheduledAt >= dayStart && item.scheduledAt < dayEnd)
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [planItems, dayStart, dayEnd],
  );

  const weekItems = useMemo(
    () =>
      (planItems ?? []).filter((item) => item.scheduledAt >= weekStart && item.scheduledAt < weekEnd),
    [planItems, weekStart, weekEnd],
  );

  const todayStatuses = useMemo(
    () => todayItems.map((item) => getPlanItemStatus(item, arrivalsByPlanItem.get(item.id))),
    [todayItems, arrivalsByPlanItem],
  );

  const todayDisplayStatuses = useMemo(
    () => todayItems.map((item) => getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now)),
    [todayItems, arrivalsByPlanItem, now],
  );

  const weekStatuses = useMemo(
    () => weekItems.map((item) => getPlanItemStatus(item, arrivalsByPlanItem.get(item.id))),
    [weekItems, arrivalsByPlanItem],
  );

  // El % de cumplimiento usa el estado "puro" (sin la distinción overdue), que sigue
  // tratando cualquier item sin llegada registrada como no resuelto todavía.
  const dailyCompliance = useMemo(() => getCompliancePercentage(todayStatuses), [todayStatuses]);
  const weeklyCompliance = useMemo(() => getCompliancePercentage(weekStatuses), [weekStatuses]);

  const todayStatusCounts = useMemo(() => {
    const counts = new Map<DisplayStatus, number>();
    for (const status of todayDisplayStatuses) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return counts;
  }, [todayDisplayStatuses]);

  const registeredTodayCount = todayItems.length - (todayStatusCounts.get('pending') ?? 0) - (todayStatusCounts.get('overdue') ?? 0);

  const todayUnplannedArrivals = useMemo(
    () =>
      arrivals.filter(
        (arrival) =>
          arrival.planItemId === null && arrival.arrivedAt >= dayStart && arrival.arrivedAt < dayEnd,
      ),
    [arrivals, dayStart, dayEnd],
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
      <Text variant="titleLarge" style={styles.dateHeader}>
        {capitalize(format(new Date(dayStart), "EEEE dd 'de' MMMM", { locale: es }))}
      </Text>
      <Text variant="bodySmall" style={styles.weekLabel}>
        Semana {weekNumber}
        {todayItems.length > 0 &&
          ` · ${registeredTodayCount} de ${todayItems.length} registrados hoy`}
      </Text>

      <View style={styles.grid}>
        <Card style={styles.complianceTile}>
          <Card.Content>
            <Text variant="displaySmall" style={{ color: getComplianceColor(dailyCompliance) }}>
              {dailyCompliance === null ? '—' : `${dailyCompliance}%`}
            </Text>
            <Text variant="labelMedium">Cumplimiento hoy</Text>
            <ProgressBar
              style={styles.progressBar}
              progress={(dailyCompliance ?? 0) / 100}
              color={getComplianceColor(dailyCompliance)}
            />
          </Card.Content>
        </Card>
        <Card style={styles.complianceTile}>
          <Card.Content>
            <Text variant="displaySmall" style={{ color: getComplianceColor(weeklyCompliance) }}>
              {weeklyCompliance === null ? '—' : `${weeklyCompliance}%`}
            </Text>
            <Text variant="labelMedium">Cumplimiento semana</Text>
            <ProgressBar
              style={styles.progressBar}
              progress={(weeklyCompliance ?? 0) / 100}
              color={getComplianceColor(weeklyCompliance)}
            />
          </Card.Content>
        </Card>
      </View>

      <View style={styles.grid}>
        {STATUS_ORDER.map((status) => (
          <Card key={status} style={styles.tile}>
            <Card.Content>
              <Text variant="displaySmall" style={{ color: DISPLAY_STATUS_COLORS[status] }}>
                {todayStatusCounts.get(status) ?? 0}
              </Text>
              <Text variant="labelMedium">{DISPLAY_STATUS_LABELS[status]}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Agenda de hoy
      </Text>
      <FlatList
        style={styles.list}
        data={todayItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, todayItems.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={<Text style={styles.empty}>No hay nada planificado para hoy.</Text>}
        renderItem={({ item }) => {
          const arrival = arrivalsByPlanItem.get(item.id);
          const status = getDisplayStatus(item, arrival, now);
          return (
            <Card style={[styles.itemCard, { borderLeftColor: DISPLAY_STATUS_COLORS[status] }]}>
              <Card.Content style={styles.itemContent}>
                <View style={styles.timeColumn}>
                  <Text variant="titleMedium">{format(new Date(item.scheduledAt), 'HH:mm')}</Text>
                  {arrival && (
                    <Text
                      variant="bodySmall"
                      style={[styles.itemDescription, { color: DISPLAY_STATUS_COLORS[status] }]}
                    >
                      {format(new Date(arrival.arrivedAt), 'HH:mm')} ·{' '}
                      {arrivalDelta(item.scheduledAt, arrival.arrivedAt)}
                    </Text>
                  )}
                </View>
                <View style={styles.itemText}>
                  <Text variant="bodyMedium">{OPERATION_TYPE_LABELS[item.operationType]}</Text>
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    {siteName(item.siteId)}
                  </Text>
                </View>
                <PlanItemStatusBadge status={status} />
              </Card.Content>
            </Card>
          );
        }}
        ListFooterComponent={
          todayUnplannedArrivals.length === 0 ? null : (
            <View>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Viajes no planificados de hoy
              </Text>
              {todayUnplannedArrivals.map((arrival) => (
                <Card key={arrival.id} style={styles.itemCard}>
                  <Card.Content>
                    <Text variant="bodyMedium">{siteName(arrival.siteId)}</Text>
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      Llegó {format(new Date(arrival.arrivedAt), 'HH:mm')}
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
  dateHeader: {
    marginBottom: 0,
  },
  weekLabel: {
    opacity: 0.7,
    marginBottom: 8,
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
  complianceTile: {
    minWidth: 150,
    flexGrow: 1,
  },
  progressBar: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
  },
  tile: {
    minWidth: 110,
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
    borderLeftWidth: 4,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeColumn: {
    width: 76,
  },
  itemText: {
    flex: 1,
  },
  itemDescription: {
    opacity: 0.7,
    marginTop: 2,
  },
});
