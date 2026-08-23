import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, Portal, SegmentedButtons, Text } from 'react-native-paper';

import { WeekBarChart } from '@/components/WeekBarChart';
import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { getDisplayStatus, type DisplayStatus } from '@/domain/rules/complianceStatus';
import { combinedCompliance, countByStatus } from '@/domain/rules/dashboardMetrics';
import { useSessionStore } from '@/store/sessionStore';
import { useAppPalette } from '@/store/themeStore';
import type { OperatorScope } from '@/types/enums';
import { matchesOperatorScope, OPERATOR_SCOPE_LABELS } from '@/utils/operatorScope';
import {
  getWeekNumber,
  startOfDay,
  startOfMonth,
  startOfNextMonth,
  startOfNextYear,
  startOfWeek,
  startOfYear,
} from '@/utils/timeBlocks';
import { getComplianceColor } from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

type Granularity = 'day' | 'week' | 'month' | 'year';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DAY_BUCKETS = 14;
const WEEK_BUCKETS = 12;
const MONTH_BUCKETS = 12;
const YEAR_BUCKETS = 5;
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DATE_FORMAT = new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit' });

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
};

// "últimas" concuerda con "semanas" (femenino); el resto son masculinos ("días", "meses",
// "años"), así que necesitan "últimos".
const GRANULARITY_QUANTIFIER: Record<Granularity, string> = {
  day: 'últimos',
  week: 'últimas',
  month: 'últimos',
  year: 'últimos',
};

interface HistoryBucket {
  label: string;
  rangeLabel: string;
  percentage: number | null;
  total: number;
  executed: number;
  pending: number;
  cancelled: number;
  unplanned: number;
}

function buildBucket(
  label: string,
  rangeLabel: string,
  start: number,
  end: number,
  items: TransportPlanItem[],
  arrivalsByPlanItem: Map<number, LoadArrival>,
  unplannedArrivals: LoadArrival[],
  now: number,
): HistoryBucket {
  const bucketItems = items.filter((item) => item.scheduledAt >= start && item.scheduledAt < end);
  const statuses: DisplayStatus[] = bucketItems.map((item) =>
    getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now),
  );
  const counts = countByStatus(statuses);
  // Igual que en el Dashboard: las cargas fuera de plan también cuentan como incumplimiento
  // del período, aunque no tengan horario planificado contra el cual medirse.
  const unplanned = unplannedArrivals.filter(
    (arrival) => arrival.arrivedAt >= start && arrival.arrivedAt < end,
  ).length;
  return {
    label,
    rangeLabel,
    percentage: combinedCompliance(statuses, unplanned),
    total: bucketItems.length,
    executed: (counts.get('on_time') ?? 0) + (counts.get('late') ?? 0) + (counts.get('early') ?? 0),
    pending: (counts.get('pending') ?? 0) + (counts.get('overdue') ?? 0),
    cancelled: counts.get('cancelled') ?? 0,
    unplanned,
  };
}

export function HistoricalScreen() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentSiteId = useSessionStore((state) => state.currentSiteId);
  const currentOperatorScope = useSessionStore((state) => state.currentOperatorScope);
  const PALETTE = useAppPalette();

  const [planItems, setPlanItems] = useState<TransportPlanItem[]>([]);
  const [arrivals, setArrivals] = useState<LoadArrival[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [granularity, setGranularity] = useState<Granularity>('week');
  const [dashboardScope, setDashboardScope] = useState<OperatorScope>('plan_transporte');
  const [selectedBucket, setSelectedBucket] = useState<HistoryBucket | null>(null);

  const loadData = useCallback(async () => {
    const [items, loadedArrivals] = await Promise.all([
      transportPlanRepository.findAll(),
      loadArrivalRepository.findAll(),
    ]);
    setPlanItems(items);
    setArrivals(loadedArrivals);
    setNow(Date.now());
  }, []);

  useFocusRefresh(loadData);

  // Igual que en el Dashboard: al operador se le acota a su propio sitio y frente de
  // trabajo; supervisor y planificador ven todos los sitios combinados, separados por el
  // mismo toggle plan de transporte / home delivery.
  const isOperatorScoped = currentUser?.role === 'operator' && currentSiteId !== null;
  const effectiveScope: OperatorScope = isOperatorScoped
    ? (currentOperatorScope ?? 'plan_transporte')
    : dashboardScope;

  const arrivalsByPlanItem = useMemo(() => {
    const map = new Map<number, LoadArrival>();
    for (const arrival of arrivals) {
      if (arrival.planItemId !== null) {
        map.set(arrival.planItemId, arrival);
      }
    }
    return map;
  }, [arrivals]);

  const scopedItems = useMemo(
    () =>
      planItems.filter((item) => {
        if (isOperatorScoped && item.siteId !== currentSiteId) {
          return false;
        }
        return matchesOperatorScope(item.operationType, effectiveScope);
      }),
    [planItems, isOperatorScoped, currentSiteId, effectiveScope],
  );

  // Cargas fuera de plan: igual que en el Dashboard, se acotan al sitio del operador pero
  // no al toggle plan de transporte/home delivery — no tienen operationType contra el cual
  // filtrar por frente de trabajo.
  const scopedUnplannedArrivals = useMemo(
    () =>
      arrivals.filter(
        (arrival) =>
          arrival.planItemId === null && (!isOperatorScoped || arrival.siteId === currentSiteId),
      ),
    [arrivals, isOperatorScoped, currentSiteId],
  );

  const buckets = useMemo<HistoryBucket[]>(() => {
    if (granularity === 'day') {
      const currentDayStart = startOfDay(now);
      return Array.from({ length: DAY_BUCKETS }, (_, index) => {
        const start = currentDayStart - (DAY_BUCKETS - 1 - index) * DAY_MS;
        const end = start + DAY_MS;
        const label = DATE_FORMAT.format(start);
        return buildBucket(
          label,
          label,
          start,
          end,
          scopedItems,
          arrivalsByPlanItem,
          scopedUnplannedArrivals,
          now,
        );
      });
    }
    if (granularity === 'week') {
      const currentWeekStart = startOfWeek(now);
      return Array.from({ length: WEEK_BUCKETS }, (_, index) => {
        const start = currentWeekStart - (WEEK_BUCKETS - 1 - index) * WEEK_MS;
        const end = start + WEEK_MS;
        const label = `S${getWeekNumber(start)}`;
        const rangeLabel = `Semana ${getWeekNumber(start)} · ${DATE_FORMAT.format(start)} – ${DATE_FORMAT.format(end - 1)}`;
        return buildBucket(
          label,
          rangeLabel,
          start,
          end,
          scopedItems,
          arrivalsByPlanItem,
          scopedUnplannedArrivals,
          now,
        );
      });
    }
    if (granularity === 'month') {
      const currentMonthStart = new Date(startOfMonth(now));
      return Array.from({ length: MONTH_BUCKETS }, (_, index) => {
        const monthDate = new Date(currentMonthStart);
        monthDate.setMonth(monthDate.getMonth() - (MONTH_BUCKETS - 1 - index));
        const start = monthDate.getTime();
        const end = startOfNextMonth(start);
        const label = `${MONTH_LABELS[monthDate.getMonth()]} ${monthDate.getFullYear() % 100}`;
        return buildBucket(
          label,
          label,
          start,
          end,
          scopedItems,
          arrivalsByPlanItem,
          scopedUnplannedArrivals,
          now,
        );
      });
    }
    const currentYear = new Date(startOfYear(now)).getFullYear();
    return Array.from({ length: YEAR_BUCKETS }, (_, index) => {
      const year = currentYear - (YEAR_BUCKETS - 1 - index);
      const start = new Date(year, 0, 1).getTime();
      const end = startOfNextYear(start);
      return buildBucket(
        String(year),
        String(year),
        start,
        end,
        scopedItems,
        arrivalsByPlanItem,
        scopedUnplannedArrivals,
        now,
      );
    });
  }, [granularity, scopedItems, arrivalsByPlanItem, scopedUnplannedArrivals, now]);

  const summary = useMemo(() => {
    // bucket.percentage puede no ser null aunque total sea 0 (solo hubo cargas fuera de
    // plan), así que no basta con mirar total para saber si el período tiene datos.
    const withData = buckets.filter((bucket) => bucket.percentage !== null);
    const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
    const executed = buckets.reduce((sum, bucket) => sum + bucket.executed, 0);
    const cancelled = buckets.reduce((sum, bucket) => sum + bucket.cancelled, 0);
    const unplanned = buckets.reduce((sum, bucket) => sum + bucket.unplanned, 0);
    const averagePercentage =
      withData.length === 0
        ? null
        : Math.round(
            withData.reduce((sum, bucket) => sum + (bucket.percentage ?? 0), 0) / withData.length,
          );
    return { total, executed, cancelled, unplanned, averagePercentage };
  }, [buckets]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isOperatorScoped && (
        <SegmentedButtons
          style={styles.scopeToggle}
          value={dashboardScope}
          onValueChange={(value) => setDashboardScope(value as OperatorScope)}
          buttons={[
            { value: 'plan_transporte', label: 'Plan semanal de transporte', icon: 'warehouse' },
            {
              value: 'home_delivery',
              label: OPERATOR_SCOPE_LABELS.home_delivery,
              icon: 'home-city-outline',
            },
          ]}
        />
      )}

      <SegmentedButtons
        style={styles.granularityToggle}
        value={granularity}
        onValueChange={(value) => setGranularity(value as Granularity)}
        buttons={[
          { value: 'day', label: 'Día', icon: 'calendar-today' },
          { value: 'week', label: 'Semana', icon: 'calendar-week-outline' },
          { value: 'month', label: 'Mes', icon: 'calendar-month-outline' },
          { value: 'year', label: 'Año', icon: 'calendar-blank-outline' },
        ]}
      />

      <Card style={styles.wideCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Cumplimiento por {GRANULARITY_LABELS[granularity].toLowerCase()} ·{' '}
            {GRANULARITY_QUANTIFIER[granularity]} {buckets.length}
          </Text>
          <WeekBarChart
            data={buckets.map((bucket) => ({
              label: bucket.label,
              percentage: bucket.percentage,
              onPress: () => setSelectedBucket(bucket),
            }))}
          />
        </Card.Content>
      </Card>

      <Card style={styles.wideCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Resumen del período mostrado
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text
                variant="headlineSmall"
                style={{ color: getComplianceColor(summary.averagePercentage) }}
              >
                {summary.averagePercentage === null ? '—' : `${summary.averagePercentage}%`}
              </Text>
              <Text variant="labelSmall" style={[styles.summaryLabel, { color: PALETTE.textMuted }]}>
                Cumplimiento promedio
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="headlineSmall">{summary.total}</Text>
              <Text variant="labelSmall" style={[styles.summaryLabel, { color: PALETTE.textMuted }]}>
                Planificados
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="headlineSmall">{summary.executed}</Text>
              <Text variant="labelSmall" style={[styles.summaryLabel, { color: PALETTE.textMuted }]}>
                Ejecutados
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="headlineSmall">{summary.cancelled}</Text>
              <Text variant="labelSmall" style={[styles.summaryLabel, { color: PALETTE.textMuted }]}>
                Cancelados
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="headlineSmall">{summary.unplanned}</Text>
              <Text variant="labelSmall" style={[styles.summaryLabel, { color: PALETTE.textMuted }]}>
                No planificados
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={selectedBucket !== null} onDismiss={() => setSelectedBucket(null)}>
          {selectedBucket && (
            <>
              <Dialog.Title>{selectedBucket.rangeLabel}</Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                <Text>
                  Cumplimiento:{' '}
                  {selectedBucket.percentage === null ? '—' : `${selectedBucket.percentage}%`}
                </Text>
                <Text>Planificados: {selectedBucket.total}</Text>
                <Text>Ejecutados: {selectedBucket.executed}</Text>
                <Text>Pendientes: {selectedBucket.pending}</Text>
                <Text>Cancelados: {selectedBucket.cancelled}</Text>
                <Text>No planificados: {selectedBucket.unplanned}</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setSelectedBucket(null)}>Cerrar</Button>
              </Dialog.Actions>
            </>
          )}
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  scopeToggle: {
    marginBottom: 4,
  },
  granularityToggle: {
    marginBottom: 4,
  },
  wideCard: {
    marginBottom: 4,
  },
  cardTitle: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    minWidth: 90,
    gap: 2,
  },
  summaryLabel: {
    opacity: 0.9,
  },
  dialogContent: {
    gap: 4,
  },
});
