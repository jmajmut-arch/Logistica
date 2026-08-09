import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Portal,
  ProgressBar,
  SegmentedButtons,
  Text,
} from 'react-native-paper';

import { DonutChart } from '@/components/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { PlanItemStatusBadge } from '@/components/PlanItemStatusBadge';
import { WeekBarChart } from '@/components/WeekBarChart';
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
import { useSessionStore } from '@/store/sessionStore';
import { OPERATION_TYPES } from '@/types/enums';
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
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentSiteId = useSessionStore((state) => state.currentSiteId);

  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [arrivals, setArrivals] = useState<LoadArrival[]>([]);
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [now, setNow] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'all'>('all');
  const [agendaScope, setAgendaScope] = useState<'day' | 'week'>('day');
  const [detail, setDetail] = useState<{ title: string; items: TransportPlanItem[] } | null>(null);

  const openDetail = useCallback((title: string, items: TransportPlanItem[]) => {
    setDetail({ title, items });
  }, []);

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

  // Al operador se le acota todo el dashboard a su propio patio/bodega (el elegido al
  // iniciar sesión); supervisor y administrador siguen viendo todos los sitios.
  const isOperatorScoped = currentUser?.role === 'operator' && currentSiteId !== null;

  const scopedPlanItems = useMemo(() => {
    const items = planItems ?? [];
    return isOperatorScoped ? items.filter((item) => item.siteId === currentSiteId) : items;
  }, [planItems, isOperatorScoped, currentSiteId]);

  const todayItems = useMemo(
    () =>
      scopedPlanItems
        .filter((item) => item.scheduledAt >= dayStart && item.scheduledAt < dayEnd)
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [scopedPlanItems, dayStart, dayEnd],
  );

  const weekItems = useMemo(
    () =>
      scopedPlanItems
        .filter((item) => item.scheduledAt >= weekStart && item.scheduledAt < weekEnd)
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [scopedPlanItems, weekStart, weekEnd],
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

  const weeklyComplianceByDay = useMemo(
    () =>
      WEEKDAY_LABELS.map((label, index) => {
        const start = weekStart + index * DAY_MS;
        const end = start + DAY_MS;
        const items = weekItems.filter((item) => item.scheduledAt >= start && item.scheduledAt < end);
        const statuses = items.map((item) => getPlanItemStatus(item, arrivalsByPlanItem.get(item.id)));
        return {
          label,
          percentage: getCompliancePercentage(statuses),
          highlight: start === dayStart,
          items,
        };
      }),
    [weekItems, weekStart, dayStart, arrivalsByPlanItem],
  );

  const weekDisplayStatuses = useMemo(
    () => weekItems.map((item) => getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now)),
    [weekItems, arrivalsByPlanItem, now],
  );

  function countByStatus(statuses: DisplayStatus[]): Map<DisplayStatus, number> {
    const counts = new Map<DisplayStatus, number>();
    for (const status of statuses) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return counts;
  }

  const todayStatusCounts = useMemo(() => countByStatus(todayDisplayStatuses), [todayDisplayStatuses]);
  const weekStatusCounts = useMemo(() => countByStatus(weekDisplayStatuses), [weekDisplayStatuses]);

  const pendingTodayCount = (todayStatusCounts.get('pending') ?? 0) + (todayStatusCounts.get('overdue') ?? 0);
  const registeredTodayCount = todayItems.length - pendingTodayCount;

  const complianceByOperationType = useMemo(
    () =>
      OPERATION_TYPES.map((type) => {
        const items = weekItems.filter((item) => item.operationType === type);
        const statuses = items.map((item) => getPlanItemStatus(item, arrivalsByPlanItem.get(item.id)));
        return { type, count: items.length, percentage: getCompliancePercentage(statuses), items };
      }),
    [weekItems, arrivalsByPlanItem],
  );

  const agendaItems = agendaScope === 'day' ? todayItems : weekItems;
  const agendaStatusCounts = agendaScope === 'day' ? todayStatusCounts : weekStatusCounts;

  const filteredAgendaItems = useMemo(() => {
    if (statusFilter === 'all') {
      return agendaItems;
    }
    return agendaItems.filter(
      (item) => getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now) === statusFilter,
    );
  }, [agendaItems, statusFilter, arrivalsByPlanItem, now]);

  const todayUnplannedArrivals = useMemo(
    () =>
      arrivals.filter(
        (arrival) =>
          arrival.planItemId === null &&
          arrival.arrivedAt >= dayStart &&
          arrival.arrivedAt < dayEnd &&
          (!isOperatorScoped || arrival.siteId === currentSiteId),
      ),
    [arrivals, dayStart, dayEnd, isOperatorScoped, currentSiteId],
  );

  const weekUnplannedArrivals = useMemo(
    () =>
      arrivals
        .filter(
          (arrival) =>
            arrival.planItemId === null &&
            arrival.arrivedAt >= weekStart &&
            arrival.arrivedAt < weekEnd &&
            (!isOperatorScoped || arrival.siteId === currentSiteId),
        )
        .sort((a, b) => a.arrivedAt - b.arrivedAt),
    [arrivals, weekStart, weekEnd, isOperatorScoped, currentSiteId],
  );

  const agendaUnplannedArrivals = agendaScope === 'day' ? todayUnplannedArrivals : weekUnplannedArrivals;

  function renderPlanItemCard(item: TransportPlanItem, wideTime: boolean) {
    const arrival = arrivalsByPlanItem.get(item.id);
    const status = getDisplayStatus(item, arrival, now);
    const timeFormat = wideTime ? 'EEE dd-MM HH:mm' : 'HH:mm';
    return (
      <Card key={item.id} style={[styles.itemCard, { borderLeftColor: DISPLAY_STATUS_COLORS[status] }]}>
        <Card.Content style={styles.itemContent}>
          <View style={wideTime ? styles.timeColumnWide : styles.timeColumn}>
            <Text variant="titleMedium">
              {format(new Date(item.scheduledAt), timeFormat, { locale: es })}
            </Text>
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
  }

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
        data={filteredAgendaItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          filteredAgendaItems.length === 0 && styles.emptyContainer,
        ]}
        ListHeaderComponent={
          <View>
            <Text variant="titleLarge" style={styles.dateHeader}>
              {capitalize(format(new Date(dayStart), "EEEE dd 'de' MMMM", { locale: es }))}
            </Text>
            <Text variant="bodySmall" style={styles.weekLabel}>
              Semana {weekNumber}
              {todayItems.length > 0 &&
                ` · ${registeredTodayCount} de ${todayItems.length} registrados hoy`}
            </Text>

            <View style={styles.grid}>
              <Card
                style={styles.complianceTile}
                onPress={() => openDetail(`Agenda de hoy (${todayItems.length})`, todayItems)}
              >
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
              <Card
                style={styles.complianceTile}
                onPress={() =>
                  openDetail(`Agenda de la semana ${weekNumber} (${weekItems.length})`, weekItems)
                }
              >
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
              <Card
                style={styles.complianceTile}
                onPress={() =>
                  openDetail(
                    'Viajes pendientes hoy',
                    todayItems.filter((item) => {
                      const status = getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now);
                      return status === 'pending' || status === 'overdue';
                    }),
                  )
                }
              >
                <Card.Content>
                  <Text variant="displaySmall" style={{ color: DISPLAY_STATUS_COLORS.overdue }}>
                    {pendingTodayCount}
                  </Text>
                  <Text variant="labelMedium">Viajes pendientes hoy</Text>
                </Card.Content>
              </Card>
            </View>

            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Distribución de hoy
                </Text>
                {todayItems.length === 0 ? (
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    No hay viajes planificados para hoy todavía.
                  </Text>
                ) : (
                  <View style={styles.donutRow}>
                    <DonutChart
                      segments={STATUS_ORDER.map((status) => ({
                        key: status,
                        value: todayStatusCounts.get(status) ?? 0,
                        color: DISPLAY_STATUS_COLORS[status],
                      }))}
                      centerValue={String(todayItems.length)}
                      centerLabel={todayItems.length === 1 ? 'viaje' : 'viajes'}
                    />
                    <View style={styles.legend}>
                      {STATUS_ORDER.map((status) => (
                        <Pressable
                          key={status}
                          style={styles.legendRow}
                          onPress={() =>
                            openDetail(
                              `${DISPLAY_STATUS_LABELS[status]} · hoy`,
                              todayItems.filter(
                                (item) =>
                                  getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now) === status,
                              ),
                            )
                          }
                        >
                          <View style={[styles.legendDot, { backgroundColor: DISPLAY_STATUS_COLORS[status] }]} />
                          <Text variant="bodyMedium" style={styles.legendLabel}>
                            {DISPLAY_STATUS_LABELS[status]}
                          </Text>
                          <Text variant="bodyMedium" style={styles.legendCount}>
                            {todayStatusCounts.get(status) ?? 0}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>

            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Cumplimiento de la semana · Semana {weekNumber}
                </Text>
                <WeekBarChart
                  data={weeklyComplianceByDay.map((day) => ({
                    ...day,
                    onPress: () =>
                      openDetail(`${capitalize(day.label)} (${day.items.length})`, day.items),
                  }))}
                />
              </Card.Content>
            </Card>

            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Distribución de la semana
                </Text>
                {weekItems.length === 0 ? (
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    No hay viajes planificados para esta semana todavía.
                  </Text>
                ) : (
                  <View style={styles.donutRow}>
                    <DonutChart
                      segments={STATUS_ORDER.map((status) => ({
                        key: status,
                        value: weekStatusCounts.get(status) ?? 0,
                        color: DISPLAY_STATUS_COLORS[status],
                      }))}
                      centerValue={String(weekItems.length)}
                      centerLabel={weekItems.length === 1 ? 'viaje' : 'viajes'}
                    />
                    <View style={styles.legend}>
                      {STATUS_ORDER.map((status) => (
                        <Pressable
                          key={status}
                          style={styles.legendRow}
                          onPress={() =>
                            openDetail(
                              `${DISPLAY_STATUS_LABELS[status]} · semana`,
                              weekItems.filter(
                                (item) =>
                                  getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now) === status,
                              ),
                            )
                          }
                        >
                          <View style={[styles.legendDot, { backgroundColor: DISPLAY_STATUS_COLORS[status] }]} />
                          <Text variant="bodyMedium" style={styles.legendLabel}>
                            {DISPLAY_STATUS_LABELS[status]}
                          </Text>
                          <Text variant="bodyMedium" style={styles.legendCount}>
                            {weekStatusCounts.get(status) ?? 0}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>

            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Cumplimiento por tipo · Semana {weekNumber}
                </Text>
                {complianceByOperationType.map(({ type, count, percentage, items }) => (
                  <Pressable
                    key={type}
                    style={styles.typeRow}
                    onPress={() => openDetail(`${OPERATION_TYPE_LABELS[type]} · semana`, items)}
                  >
                    <View style={styles.typeHeaderRow}>
                      <Text variant="bodyMedium">{OPERATION_TYPE_LABELS[type]}</Text>
                      <Text variant="bodyMedium" style={{ color: getComplianceColor(percentage) }}>
                        {percentage === null ? '—' : `${percentage}%`}
                      </Text>
                    </View>
                    <ProgressBar
                      style={styles.progressBar}
                      progress={(percentage ?? 0) / 100}
                      color={getComplianceColor(percentage)}
                    />
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      {count} {count === 1 ? 'viaje planificado' : 'viajes planificados'} esta semana
                    </Text>
                  </Pressable>
                ))}
              </Card.Content>
            </Card>

            <View style={styles.agendaHeaderRow}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {agendaScope === 'day' ? 'Agenda de hoy' : `Agenda de la semana ${weekNumber}`}
              </Text>
            </View>
            <SegmentedButtons
              style={styles.agendaToggle}
              value={agendaScope}
              onValueChange={(value) => setAgendaScope(value as 'day' | 'week')}
              buttons={[
                { value: 'day', label: `Hoy (${todayItems.length})` },
                { value: 'week', label: `Semana (${weekItems.length})` },
              ]}
            />
            <View style={styles.filterRow}>
              <Chip selected={statusFilter === 'all'} onPress={() => setStatusFilter('all')}>
                Todos ({agendaItems.length})
              </Chip>
              {STATUS_ORDER.map((status) => (
                <Chip
                  key={status}
                  selected={statusFilter === status}
                  onPress={() => setStatusFilter(status)}
                >
                  {DISPLAY_STATUS_LABELS[status]} ({agendaStatusCounts.get(status) ?? 0})
                </Chip>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-check-outline"
            message={
              agendaItems.length === 0
                ? agendaScope === 'day'
                  ? 'No hay nada planificado para hoy.'
                  : 'No hay nada planificado para esta semana.'
                : 'No hay viajes con este estado.'
            }
          />
        }
        renderItem={({ item }) => renderPlanItemCard(item, agendaScope === 'week')}
        ListFooterComponent={
          agendaUnplannedArrivals.length === 0 ? null : (
            <View>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {agendaScope === 'day' ? 'Viajes no planificados de hoy' : 'Viajes no planificados de la semana'}
              </Text>
              {agendaUnplannedArrivals.map((arrival) => (
                <Card key={arrival.id} style={styles.itemCard}>
                  <Card.Content>
                    <Text variant="bodyMedium">{siteName(arrival.siteId)}</Text>
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      Llegó{' '}
                      {format(
                        new Date(arrival.arrivedAt),
                        agendaScope === 'day' ? 'HH:mm' : 'EEE dd-MM HH:mm',
                        { locale: es },
                      )}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )
        }
      />

      <Portal>
        <Dialog visible={detail !== null} onDismiss={() => setDetail(null)} style={styles.detailDialog}>
          <Dialog.Title>{detail?.title}</Dialog.Title>
          <Dialog.ScrollArea style={styles.detailScrollArea}>
            <ScrollView contentContainerStyle={styles.detailScrollContent}>
              {detail?.items.length === 0 ? (
                <Text style={styles.itemDescription}>No hay viajes en este grupo.</Text>
              ) : (
                detail?.items.map((item) => renderPlanItemCard(item, true))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDetail(null)}>Cerrar</Button>
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
  detailDialog: {
    maxHeight: '80%',
  },
  detailScrollArea: {
    paddingHorizontal: 0,
  },
  detailScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 4,
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
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agendaToggle: {
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  complianceTile: {
    minWidth: 150,
    flexGrow: 1,
  },
  wideCard: {
    marginBottom: 12,
  },
  cardTitle: {
    marginBottom: 12,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  legend: {
    flex: 1,
    minWidth: 150,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
  },
  legendCount: {
    fontWeight: '700',
  },
  typeRow: {
    marginBottom: 14,
  },
  typeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressBar: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
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
  timeColumnWide: {
    width: 108,
  },
  itemText: {
    flex: 1,
  },
  itemDescription: {
    opacity: 0.7,
    marginTop: 2,
  },
});
