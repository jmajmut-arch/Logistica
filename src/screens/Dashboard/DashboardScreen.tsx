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
  IconButton,
  Portal,
  ProgressBar,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { DonutChart } from '@/components/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { HeavyCraneBadge } from '@/components/HeavyCraneBadge';
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
  type DisplayStatus,
} from '@/domain/rules/complianceStatus';
import { useSessionStore } from '@/store/sessionStore';
import { PALETTE } from '@/theme';
import { OPERATION_TYPES, type OperatorScope } from '@/types/enums';
import { matchesOperatorScope, OPERATOR_SCOPE_LABELS } from '@/utils/operatorScope';
import { getWeekNumber, startOfDay, startOfToday, startOfWeek } from '@/utils/timeBlocks';
import {
  DISPLAY_STATUS_COLORS,
  DISPLAY_STATUS_LABELS,
  EXTENDED_STATUS_COLORS,
  EXTENDED_STATUS_LABELS,
  getComplianceColor,
  getExtendedStatusLabel,
  getUnplannedCountLabel,
  getUnplannedLabel,
  OPERATION_TYPE_LABELS,
  type ExtendedDisplayStatus,
} from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUS_ORDER: DisplayStatus[] = ['overdue', 'cancelled', 'late', 'pending', 'early', 'on_time'];
const EXTENDED_STATUS_ORDER: ExtendedDisplayStatus[] = [...STATUS_ORDER, 'out_of_plan'];
const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// Paleta rotativa para el donut de destinos (sitios): a diferencia de los estados del
// plan, la cantidad de sitios es variable, así que no hay un color fijo por sitio.
const SITE_CHART_COLORS = [
  '#38bdf8',
  '#fb923c',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#facc15',
  '#22d3ee',
  '#fb7185',
];
// Tope de días para el desglose diario del rango personalizado: un rango de meses no
// debería intentar dibujar cientos de barras.
const MAX_RANGE_DAYS = 92;

type DetailState =
  | { kind: 'items'; title: string; items: TransportPlanItem[] }
  | { kind: 'unplanned'; title: string; arrivals: LoadArrival[] };

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

/** Cuenta las cargas fuera de plan como incumplimiento adicional del período: no tienen
 * horario contra el cual medirse, pero sí bajan el % porque el plan no las anticipó. */
function combinedCompliance(planStatuses: DisplayStatus[], unplannedCount: number): number | null {
  const total = planStatuses.length + unplannedCount;
  if (total === 0) {
    return null;
  }
  const onTime = planStatuses.filter((status) => status === 'on_time').length;
  return Math.round((onTime / total) * 100);
}

/** % de items planificados a los que efectivamente llegó un camión, sin importar si fue a
 * tiempo, atrasado o anticipado — mide si el camión llegó según lo planificado. */
function arrivalCompliance(planStatuses: DisplayStatus[]): number | null {
  if (planStatuses.length === 0) {
    return null;
  }
  const arrived = planStatuses.filter(
    (status) => status === 'on_time' || status === 'late' || status === 'early',
  ).length;
  return Math.round((arrived / planStatuses.length) * 100);
}

/** % de los camiones que sí llegaron y lo hicieron dentro del horario planificado — mide
 * adherencia horaria solo entre los que llegaron (si nunca llegó, ya lo penaliza
 * arrivalCompliance, no esta métrica). */
function scheduleAdherence(planStatuses: DisplayStatus[]): number | null {
  const arrived = planStatuses.filter(
    (status) => status === 'on_time' || status === 'late' || status === 'early',
  );
  if (arrived.length === 0) {
    return null;
  }
  const onTime = arrived.filter((status) => status === 'on_time').length;
  return Math.round((onTime / arrived.length) * 100);
}

export function DashboardScreen() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentSiteId = useSessionStore((state) => state.currentSiteId);
  const currentOperatorScope = useSessionStore((state) => state.currentOperatorScope);

  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [arrivals, setArrivals] = useState<LoadArrival[]>([]);
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [now, setNow] = useState(() => Date.now());
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'all'>('all');
  const [agendaScope, setAgendaScope] = useState<'day' | 'week'>('day');
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [customRange, setCustomRange] = useState<{ start: number; end: number } | null>(null);
  const [rangePickerVisible, setRangePickerVisible] = useState(false);
  const [craneFilter, setCraneFilter] = useState<'all' | 'crane' | 'no_crane'>('all');
  // Supervisor y planificador eligen qué segmento del dashboard ver (el operador ya viene
  // acotado a su propio frente de trabajo desde el login, así que no necesita el toggle).
  const [dashboardScope, setDashboardScope] = useState<OperatorScope>('plan_transporte');

  const openDetail = useCallback((title: string, items: TransportPlanItem[]) => {
    setDetail({ kind: 'items', title, items });
  }, []);

  const openUnplannedDetail = useCallback((title: string, unplannedArrivals: LoadArrival[]) => {
    setDetail({ kind: 'unplanned', title, arrivals: unplannedArrivals });
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

  // Al operador se le acota todo el dashboard a su propio patio/bodega y al frente de
  // trabajo elegidos al iniciar sesión. Supervisor y planificador ven todo el sitio, pero
  // el dashboard igual queda separado en los mismos dos segmentos (plan semanal / home
  // delivery) mediante el toggle, en vez de mezclarlos.
  const isOperatorScoped = currentUser?.role === 'operator' && currentSiteId !== null;
  const effectiveScope: OperatorScope = isOperatorScoped
    ? (currentOperatorScope ?? 'plan_transporte')
    : dashboardScope;

  const scopedPlanItems = useMemo(() => {
    const items = planItems ?? [];
    return items.filter((item) => {
      if (isOperatorScoped && item.siteId !== currentSiteId) {
        return false;
      }
      return matchesOperatorScope(item.operationType, effectiveScope);
    });
  }, [planItems, isOperatorScoped, currentSiteId, effectiveScope]);

  const scopedOperationTypes = useMemo(
    () => OPERATION_TYPES.filter((type) => matchesOperatorScope(type, effectiveScope)),
    [effectiveScope],
  );

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

  // Cargas que llegaron sin estar planificadas: se suman como incumplimiento adicional
  // en los gráficos y % de cumplimiento, además de listarse aparte en la agenda.
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

  // Rango de fechas personalizado, elegido a mano: se calcula igual que hoy/semana pero
  // con límites arbitrarios en vez de fijos.
  const customRangeItems = useMemo(() => {
    if (!customRange) {
      return [];
    }
    const rangeEnd = customRange.end + DAY_MS;
    return scopedPlanItems
      .filter((item) => item.scheduledAt >= customRange.start && item.scheduledAt < rangeEnd)
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [scopedPlanItems, customRange]);

  const customRangeUnplannedArrivals = useMemo(() => {
    if (!customRange) {
      return [];
    }
    const rangeEnd = customRange.end + DAY_MS;
    return arrivals.filter(
      (arrival) =>
        arrival.planItemId === null &&
        arrival.arrivedAt >= customRange.start &&
        arrival.arrivedAt < rangeEnd &&
        (!isOperatorScoped || arrival.siteId === currentSiteId),
    );
  }, [arrivals, customRange, isOperatorScoped, currentSiteId]);

  const customRangeDisplayStatuses = useMemo(
    () =>
      customRangeItems.map((item) => getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now)),
    [customRangeItems, arrivalsByPlanItem, now],
  );

  const customRangeCompliance = useMemo(
    () => combinedCompliance(customRangeDisplayStatuses, customRangeUnplannedArrivals.length),
    [customRangeDisplayStatuses, customRangeUnplannedArrivals],
  );

  // Viajes que todavía están por venir: sin llegada registrada, y no vencidos (un "sin
  // horario" siempre cuenta como próximo hasta que se registre, igual que en el estado de
  // cumplimiento). Sirve para que el supervisor prepare con anticipación la grúa de 32 t.
  const futurePlanItems = useMemo(
    () =>
      scopedPlanItems
        .filter((item) => {
          if (arrivalsByPlanItem.has(item.id) || item.cancelledByOperator) {
            return false;
          }
          // Un "sin horario" no tiene una hora exacta contra la cual comparar, pero sigue
          // siendo de un día concreto — antes contaba como "futuro" aunque fuera de una
          // semana ya pasada, con tal de no tener llegada registrada.
          return item.hasNoSchedule ? item.scheduledAt >= dayStart : item.scheduledAt >= now;
        })
        .sort((a, b) => a.scheduledAt - b.scheduledAt),
    [scopedPlanItems, arrivalsByPlanItem, now, dayStart],
  );

  const futureCraneItems = useMemo(
    () => futurePlanItems.filter((item) => item.requiresHeavyCrane),
    [futurePlanItems],
  );
  const futureNoCraneItems = useMemo(
    () => futurePlanItems.filter((item) => !item.requiresHeavyCrane),
    [futurePlanItems],
  );

  const filteredFutureItems =
    craneFilter === 'crane'
      ? futureCraneItems
      : craneFilter === 'no_crane'
        ? futureNoCraneItems
        : futurePlanItems;

  const todayDisplayStatuses = useMemo(
    () => todayItems.map((item) => getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now)),
    [todayItems, arrivalsByPlanItem, now],
  );

  const weekDisplayStatuses = useMemo(
    () => weekItems.map((item) => getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now)),
    [weekItems, arrivalsByPlanItem, now],
  );

  // Desglose del cumplimiento en sus dos causas: si el camión llegó (sin importar la hora)
  // y, entre los que llegaron, si respetaron el horario planificado. Se calcula igual para
  // hoy y para la semana, para que ambas secciones del Dashboard tengan la misma estructura.
  const dailyArrivalCompliance = useMemo(
    () => arrivalCompliance(todayDisplayStatuses),
    [todayDisplayStatuses],
  );
  const dailyScheduleAdherence = useMemo(
    () => scheduleAdherence(todayDisplayStatuses),
    [todayDisplayStatuses],
  );
  const weeklyArrivalCompliance = useMemo(
    () => arrivalCompliance(weekDisplayStatuses),
    [weekDisplayStatuses],
  );
  const weeklyScheduleAdherence = useMemo(
    () => scheduleAdherence(weekDisplayStatuses),
    [weekDisplayStatuses],
  );

  const weeklyComplianceByDay = useMemo(
    () =>
      WEEKDAY_LABELS.map((label, index) => {
        const start = weekStart + index * DAY_MS;
        const end = start + DAY_MS;
        const items = weekItems.filter(
          (item) => item.scheduledAt >= start && item.scheduledAt < end,
        );
        const statuses = items.map((item) =>
          getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now),
        );
        const unplannedCount = weekUnplannedArrivals.filter(
          (arrival) => arrival.arrivedAt >= start && arrival.arrivedAt < end,
        ).length;
        return {
          label,
          // "Camión llegado según plan" (llegó, sin importar la hora), igual que la cajita
          // del mismo nombre — no el % de cumplimiento a tiempo, para ver de un vistazo qué
          // días tuvieron camiones que nunca llegaron (pendientes/cancelados).
          percentage: arrivalCompliance(statuses),
          highlight: start === dayStart,
          items,
          unplannedCount,
        };
      }),
    [weekItems, weekUnplannedArrivals, weekStart, dayStart, arrivalsByPlanItem, now],
  );

  function countByStatus(statuses: DisplayStatus[]): Map<DisplayStatus, number> {
    const counts = new Map<DisplayStatus, number>();
    for (const status of statuses) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return counts;
  }

  const todayStatusCounts = useMemo(
    () => countByStatus(todayDisplayStatuses),
    [todayDisplayStatuses],
  );
  const weekStatusCounts = useMemo(() => countByStatus(weekDisplayStatuses), [weekDisplayStatuses]);
  const customRangeStatusCounts = useMemo(
    () => countByStatus(customRangeDisplayStatuses),
    [customRangeDisplayStatuses],
  );

  // Desglose día por día del rango elegido, para graficarlo con el mismo estilo de barras
  // que "Cumplimiento de la semana" — todo asociado al rango, nunca a la semana calendario.
  const customRangeComplianceByDay = useMemo(() => {
    if (!customRange) {
      return [];
    }
    const totalDays = Math.round((customRange.end - customRange.start) / DAY_MS) + 1;
    if (totalDays > MAX_RANGE_DAYS) {
      return [];
    }
    const days: {
      label: string;
      percentage: number | null;
      items: TransportPlanItem[];
      unplannedCount: number;
    }[] = [];
    for (let start = customRange.start; start <= customRange.end; start += DAY_MS) {
      const end = start + DAY_MS;
      const items = customRangeItems.filter(
        (item) => item.scheduledAt >= start && item.scheduledAt < end,
      );
      const statuses = items.map((item) =>
        getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now),
      );
      const unplannedCount = customRangeUnplannedArrivals.filter(
        (arrival) => arrival.arrivedAt >= start && arrival.arrivedAt < end,
      ).length;
      days.push({
        label: format(new Date(start), 'dd/MM', { locale: es }),
        percentage: combinedCompliance(statuses, unplannedCount),
        items,
        unplannedCount,
      });
    }
    return days;
  }, [customRange, customRangeItems, customRangeUnplannedArrivals, arrivalsByPlanItem, now]);

  // Destinos (sitios) del rango elegido — misma idea que agendaItemsBySite, pero atada al
  // rango personalizado en vez del toggle Hoy/Semana.
  const customRangeItemsBySite = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of customRangeItems) {
      counts.set(item.siteId, (counts.get(item.siteId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([siteId, count]) => ({ siteId, count }))
      .sort((a, b) => b.count - a.count);
  }, [customRangeItems]);

  const pendingTodayCount =
    (todayStatusCounts.get('pending') ?? 0) + (todayStatusCounts.get('overdue') ?? 0);
  // Ejecutados = con llegada real registrada. No es "total - pendientes": un viaje
  // cancelado por el operador tampoco es pendiente, pero tampoco se ejecutó — si se
  // restaba solo lo pendiente, un cancelado quedaba contado como ejecutado.
  const registeredTodayCount =
    (todayStatusCounts.get('on_time') ?? 0) +
    (todayStatusCounts.get('late') ?? 0) +
    (todayStatusCounts.get('early') ?? 0);
  const cancelledTodayCount = todayStatusCounts.get('cancelled') ?? 0;
  const pendingWeekCount =
    (weekStatusCounts.get('pending') ?? 0) + (weekStatusCounts.get('overdue') ?? 0);
  const registeredWeekCount =
    (weekStatusCounts.get('on_time') ?? 0) +
    (weekStatusCounts.get('late') ?? 0) +
    (weekStatusCounts.get('early') ?? 0);
  const cancelledWeekCount = weekStatusCounts.get('cancelled') ?? 0;

  const complianceByOperationType = useMemo(
    () =>
      scopedOperationTypes.map((type) => {
        const items = weekItems.filter((item) => item.operationType === type);
        const statuses = items.map((item) =>
          getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now),
        );
        return { type, count: items.length, percentage: getCompliancePercentage(statuses), items };
      }),
    [scopedOperationTypes, weekItems, arrivalsByPlanItem, now],
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

  const agendaUnplannedArrivals =
    agendaScope === 'day' ? todayUnplannedArrivals : weekUnplannedArrivals;

  // Destinos (sitios) fijos a hoy/semana: las secciones "Hoy" y "Esta semana" tienen cada
  // una su propio gráfico de destinos, sin depender del toggle Hoy/Semana de la agenda que
  // vive más abajo (ese toggle solo controla la lista de la agenda, no estos gráficos).
  const todayItemsBySite = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of todayItems) {
      counts.set(item.siteId, (counts.get(item.siteId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([siteId, count]) => ({ siteId, count }))
      .sort((a, b) => b.count - a.count);
  }, [todayItems]);
  const weekItemsBySite = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of weekItems) {
      counts.set(item.siteId, (counts.get(item.siteId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([siteId, count]) => ({ siteId, count }))
      .sort((a, b) => b.count - a.count);
  }, [weekItems]);

  function renderPlanItemCard(item: TransportPlanItem, wideTime: boolean) {
    const arrival = arrivalsByPlanItem.get(item.id);
    const status = getDisplayStatus(item, arrival, now);
    const timeFormat = wideTime ? 'EEE dd-MM HH:mm' : 'HH:mm';
    return (
      <Card
        key={item.id}
        style={[styles.itemCard, { borderLeftColor: DISPLAY_STATUS_COLORS[status] }]}
      >
        <Card.Content style={styles.itemContent}>
          <View style={wideTime ? styles.timeColumnWide : styles.timeColumn}>
            <Text variant={item.hasNoSchedule ? 'bodyMedium' : 'titleMedium'}>
              {item.hasNoSchedule
                ? 'Sin horario'
                : format(new Date(item.scheduledAt), timeFormat, { locale: es })}
            </Text>
            {arrival && (
              <Text
                variant="bodySmall"
                style={[styles.itemDescription, { color: DISPLAY_STATUS_COLORS[status] }]}
              >
                {item.hasNoSchedule
                  ? format(new Date(arrival.arrivedAt), 'HH:mm')
                  : `${format(new Date(arrival.arrivedAt), 'HH:mm')} · ${arrivalDelta(item.scheduledAt, arrival.arrivedAt)}`}
              </Text>
            )}
          </View>
          <View style={styles.itemText}>
            <Text variant="bodyMedium">{OPERATION_TYPE_LABELS[item.operationType]}</Text>
            <Text variant="bodySmall" style={styles.itemDescription}>
              {siteName(item.siteId)}
            </Text>
            {item.requiresHeavyCrane && <HeavyCraneBadge compact />}
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
            <Text variant="headlineSmall" style={styles.dashboardTitle}>
              Dashboard ·{' '}
              {effectiveScope === 'home_delivery' ? 'Home delivery' : 'Plan semanal de transporte'}
            </Text>
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
            <Text variant="titleLarge" style={styles.dateHeader}>
              {capitalize(format(new Date(dayStart), "EEEE dd 'de' MMMM", { locale: es }))}
            </Text>
            <Text variant="bodySmall" style={styles.weekLabel}>
              Semana {weekNumber}
              {todayItems.length > 0 &&
                ` · ${registeredTodayCount} de ${todayItems.length} registrados hoy`}
              {todayUnplannedArrivals.length > 0 &&
                ` · ${todayUnplannedArrivals.length} ${getUnplannedCountLabel(effectiveScope)}`}
            </Text>

            <Text variant="titleMedium" style={styles.groupTitle}>
              Hoy
            </Text>
            <View style={styles.grid}>
              <Card
                style={styles.complianceTile}
                onPress={() => openDetail(`Agenda de hoy (${todayItems.length})`, todayItems)}
              >
                <Card.Content>
                  <Text
                    variant="displaySmall"
                    style={{ color: getComplianceColor(dailyArrivalCompliance) }}
                  >
                    {dailyArrivalCompliance === null ? '—' : `${dailyArrivalCompliance}%`}
                  </Text>
                  <Text variant="labelMedium">Cumplimiento hoy (camiones recepcionados según plan)</Text>
                  <ProgressBar
                    style={styles.progressBar}
                    progress={(dailyArrivalCompliance ?? 0) / 100}
                    color={getComplianceColor(dailyArrivalCompliance)}
                  />
                </Card.Content>
              </Card>
              <Card
                style={styles.complianceTile}
                onPress={() => openDetail(`Agenda de hoy (${todayItems.length})`, todayItems)}
              >
                <Card.Content>
                  <Text
                    variant="displaySmall"
                    style={{ color: getComplianceColor(dailyScheduleAdherence) }}
                  >
                    {dailyScheduleAdherence === null ? '—' : `${dailyScheduleAdherence}%`}
                  </Text>
                  <Text variant="labelMedium">Adherencia horaria</Text>
                  <ProgressBar
                    style={styles.progressBar}
                    progress={(dailyScheduleAdherence ?? 0) / 100}
                    color={getComplianceColor(dailyScheduleAdherence)}
                  />
                </Card.Content>
              </Card>
              <Card
                style={styles.complianceTile}
                onPress={() =>
                  openDetail(
                    'Viajes ejecutados hoy',
                    todayItems.filter((item) => arrivalsByPlanItem.has(item.id)),
                  )
                }
              >
                <Card.Content>
                  <Text variant="displaySmall" style={{ color: DISPLAY_STATUS_COLORS.on_time }}>
                    {registeredTodayCount}
                  </Text>
                  <Text variant="labelMedium">Viajes ejecutados hoy</Text>
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
                    {pendingTodayCount}/{todayItems.length}
                  </Text>
                  <Text variant="labelMedium">Viajes pendientes hoy</Text>
                </Card.Content>
              </Card>
              <Card
                style={styles.complianceTile}
                onPress={() =>
                  openDetail(
                    'Viajes cancelados hoy',
                    todayItems.filter((item) => item.cancelledByOperator),
                  )
                }
              >
                <Card.Content>
                  <Text variant="displaySmall" style={{ color: DISPLAY_STATUS_COLORS.cancelled }}>
                    {cancelledTodayCount}
                  </Text>
                  <Text variant="labelMedium">Viajes cancelados hoy</Text>
                </Card.Content>
              </Card>
            </View>

            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Distribución de hoy
                </Text>
                {todayItems.length === 0 && todayUnplannedArrivals.length === 0 ? (
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    No hay viajes planificados ni registrados para hoy todavía.
                  </Text>
                ) : (
                  <View style={styles.donutRow}>
                    <DonutChart
                      segments={EXTENDED_STATUS_ORDER.map((status) => ({
                        key: status,
                        value:
                          status === 'out_of_plan'
                            ? todayUnplannedArrivals.length
                            : (todayStatusCounts.get(status) ?? 0),
                        color: EXTENDED_STATUS_COLORS[status],
                      }))}
                      centerValue={String(todayItems.length + todayUnplannedArrivals.length)}
                      centerLabel={
                        todayItems.length + todayUnplannedArrivals.length === 1 ? 'viaje' : 'viajes'
                      }
                    />
                    <View style={styles.legend}>
                      {EXTENDED_STATUS_ORDER.map((status) => (
                        <Pressable
                          key={status}
                          style={styles.legendRow}
                          onPress={() => {
                            if (status === 'out_of_plan') {
                              openUnplannedDetail(
                                `${getUnplannedLabel(effectiveScope)} · hoy`,
                                todayUnplannedArrivals,
                              );
                              return;
                            }
                            openDetail(
                              `${EXTENDED_STATUS_LABELS[status]} · hoy`,
                              todayItems.filter(
                                (item) =>
                                  getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now) ===
                                  status,
                              ),
                            );
                          }}
                        >
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: EXTENDED_STATUS_COLORS[status] },
                            ]}
                          />
                          <Text variant="bodyMedium" style={styles.legendLabel}>
                            {getExtendedStatusLabel(status, effectiveScope)}
                          </Text>
                          <Text variant="bodyMedium" style={styles.legendCount}>
                            {status === 'out_of_plan'
                              ? todayUnplannedArrivals.length
                              : (todayStatusCounts.get(status) ?? 0)}
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
                  Destinos de las cargas · hoy
                </Text>
                {todayItemsBySite.length === 0 ? (
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    No hay viajes planificados para hoy todavía.
                  </Text>
                ) : (
                  <View style={styles.donutRow}>
                    <DonutChart
                      segments={todayItemsBySite.map((entry, index) => ({
                        key: String(entry.siteId),
                        value: entry.count,
                        color: SITE_CHART_COLORS[index % SITE_CHART_COLORS.length],
                      }))}
                      centerValue={String(todayItems.length)}
                      centerLabel={todayItems.length === 1 ? 'viaje' : 'viajes'}
                    />
                    <View style={styles.legend}>
                      {todayItemsBySite.map((entry, index) => (
                        <Pressable
                          key={entry.siteId}
                          style={styles.legendRow}
                          onPress={() =>
                            openDetail(
                              `${siteName(entry.siteId)} · hoy (${entry.count})`,
                              todayItems.filter((item) => item.siteId === entry.siteId),
                            )
                          }
                        >
                          <View
                            style={[
                              styles.legendDot,
                              {
                                backgroundColor:
                                  SITE_CHART_COLORS[index % SITE_CHART_COLORS.length],
                              },
                            ]}
                          />
                          <Text variant="bodyMedium" style={styles.legendLabel}>
                            {siteName(entry.siteId)}
                          </Text>
                          <Text variant="bodyMedium" style={styles.legendCount}>
                            {entry.count}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>

            <Text variant="titleMedium" style={styles.groupTitle}>
              Esta semana · Semana {weekNumber}
            </Text>
            <View style={styles.grid}>
              <Card
                style={styles.complianceTile}
                onPress={() =>
                  openDetail(`Agenda de la semana ${weekNumber} (${weekItems.length})`, weekItems)
                }
              >
                <Card.Content>
                  <Text
                    variant="displaySmall"
                    style={{ color: getComplianceColor(weeklyArrivalCompliance) }}
                  >
                    {weeklyArrivalCompliance === null ? '—' : `${weeklyArrivalCompliance}%`}
                  </Text>
                  <Text variant="labelMedium">Cumplimiento semana (camiones recepcionados según plan)</Text>
                  <ProgressBar
                    style={styles.progressBar}
                    progress={(weeklyArrivalCompliance ?? 0) / 100}
                    color={getComplianceColor(weeklyArrivalCompliance)}
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
                  <Text
                    variant="displaySmall"
                    style={{ color: getComplianceColor(weeklyScheduleAdherence) }}
                  >
                    {weeklyScheduleAdherence === null ? '—' : `${weeklyScheduleAdherence}%`}
                  </Text>
                  <Text variant="labelMedium">Adherencia horaria</Text>
                  <ProgressBar
                    style={styles.progressBar}
                    progress={(weeklyScheduleAdherence ?? 0) / 100}
                    color={getComplianceColor(weeklyScheduleAdherence)}
                  />
                </Card.Content>
              </Card>
              <Card
                style={styles.complianceTile}
                onPress={() =>
                  openDetail(
                    'Viajes ejecutados esta semana',
                    weekItems.filter((item) => arrivalsByPlanItem.has(item.id)),
                  )
                }
              >
                <Card.Content>
                  <Text variant="displaySmall" style={{ color: DISPLAY_STATUS_COLORS.on_time }}>
                    {registeredWeekCount}
                  </Text>
                  <Text variant="labelMedium">Viajes ejecutados semana</Text>
                </Card.Content>
              </Card>
              <Card
                style={styles.complianceTile}
                onPress={() =>
                  openDetail(
                    'Viajes pendientes esta semana',
                    weekItems.filter((item) => {
                      const status = getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now);
                      return status === 'pending' || status === 'overdue';
                    }),
                  )
                }
              >
                <Card.Content>
                  <Text variant="displaySmall" style={{ color: DISPLAY_STATUS_COLORS.overdue }}>
                    {pendingWeekCount}/{weekItems.length}
                  </Text>
                  <Text variant="labelMedium">Viajes pendientes semana</Text>
                </Card.Content>
              </Card>
              <Card
                style={styles.complianceTile}
                onPress={() =>
                  openDetail(
                    'Viajes cancelados esta semana',
                    weekItems.filter((item) => item.cancelledByOperator),
                  )
                }
              >
                <Card.Content>
                  <Text variant="displaySmall" style={{ color: DISPLAY_STATUS_COLORS.cancelled }}>
                    {cancelledWeekCount}
                  </Text>
                  <Text variant="labelMedium">Viajes cancelados semana</Text>
                </Card.Content>
              </Card>
            </View>

            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Camión llegado según plan · Semana {weekNumber}
                </Text>
                <WeekBarChart
                  data={weeklyComplianceByDay.map((day) => ({
                    ...day,
                    onPress: () =>
                      openDetail(
                        `${capitalize(day.label)} — ${day.items.length} planificados${
                          day.unplannedCount > 0
                            ? ` (+${day.unplannedCount} ${getUnplannedCountLabel(effectiveScope)})`
                            : ''
                        }`,
                        day.items,
                      ),
                  }))}
                />
              </Card.Content>
            </Card>

            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Distribución de la semana
                </Text>
                {weekItems.length === 0 && weekUnplannedArrivals.length === 0 ? (
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    No hay viajes planificados ni registrados para esta semana todavía.
                  </Text>
                ) : (
                  <View style={styles.donutRow}>
                    <DonutChart
                      segments={EXTENDED_STATUS_ORDER.map((status) => ({
                        key: status,
                        value:
                          status === 'out_of_plan'
                            ? weekUnplannedArrivals.length
                            : (weekStatusCounts.get(status) ?? 0),
                        color: EXTENDED_STATUS_COLORS[status],
                      }))}
                      centerValue={String(weekItems.length + weekUnplannedArrivals.length)}
                      centerLabel={
                        weekItems.length + weekUnplannedArrivals.length === 1 ? 'viaje' : 'viajes'
                      }
                    />
                    <View style={styles.legend}>
                      {EXTENDED_STATUS_ORDER.map((status) => (
                        <Pressable
                          key={status}
                          style={styles.legendRow}
                          onPress={() => {
                            if (status === 'out_of_plan') {
                              openUnplannedDetail(
                                `${getUnplannedLabel(effectiveScope)} · semana`,
                                weekUnplannedArrivals,
                              );
                              return;
                            }
                            openDetail(
                              `${EXTENDED_STATUS_LABELS[status]} · semana`,
                              weekItems.filter(
                                (item) =>
                                  getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now) ===
                                  status,
                              ),
                            );
                          }}
                        >
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: EXTENDED_STATUS_COLORS[status] },
                            ]}
                          />
                          <Text variant="bodyMedium" style={styles.legendLabel}>
                            {getExtendedStatusLabel(status, effectiveScope)}
                          </Text>
                          <Text variant="bodyMedium" style={styles.legendCount}>
                            {status === 'out_of_plan'
                              ? weekUnplannedArrivals.length
                              : (weekStatusCounts.get(status) ?? 0)}
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
                  Destinos de las cargas · semana {weekNumber}
                </Text>
                {weekItemsBySite.length === 0 ? (
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    No hay viajes planificados para esta semana todavía.
                  </Text>
                ) : (
                  <View style={styles.donutRow}>
                    <DonutChart
                      segments={weekItemsBySite.map((entry, index) => ({
                        key: String(entry.siteId),
                        value: entry.count,
                        color: SITE_CHART_COLORS[index % SITE_CHART_COLORS.length],
                      }))}
                      centerValue={String(weekItems.length)}
                      centerLabel={weekItems.length === 1 ? 'viaje' : 'viajes'}
                    />
                    <View style={styles.legend}>
                      {weekItemsBySite.map((entry, index) => (
                        <Pressable
                          key={entry.siteId}
                          style={styles.legendRow}
                          onPress={() =>
                            openDetail(
                              `${siteName(entry.siteId)} · semana ${weekNumber} (${entry.count})`,
                              weekItems.filter((item) => item.siteId === entry.siteId),
                            )
                          }
                        >
                          <View
                            style={[
                              styles.legendDot,
                              {
                                backgroundColor:
                                  SITE_CHART_COLORS[index % SITE_CHART_COLORS.length],
                              },
                            ]}
                          />
                          <Text variant="bodyMedium" style={styles.legendLabel}>
                            {siteName(entry.siteId)}
                          </Text>
                          <Text variant="bodyMedium" style={styles.legendCount}>
                            {entry.count}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>

            {scopedOperationTypes.length > 1 && (
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
                        <Text
                          variant="bodyMedium"
                          style={{ color: getComplianceColor(percentage) }}
                        >
                          {percentage === null ? '—' : `${percentage}%`}
                        </Text>
                      </View>
                      <ProgressBar
                        style={styles.progressBar}
                        progress={(percentage ?? 0) / 100}
                        color={getComplianceColor(percentage)}
                      />
                      <Text variant="bodySmall" style={styles.itemDescription}>
                        {count} {count === 1 ? 'viaje planificado' : 'viajes planificados'} esta
                        semana
                      </Text>
                    </Pressable>
                  ))}
                </Card.Content>
              </Card>
            )}

            <Text variant="titleMedium" style={styles.groupTitle}>
              Viajes futuros
            </Text>
            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Viajes futuros y grúa de 32 t
                </Text>
                <SegmentedButtons
                  style={styles.craneFilterToggle}
                  value={craneFilter}
                  onValueChange={(value) => setCraneFilter(value as 'all' | 'crane' | 'no_crane')}
                  buttons={[
                    { value: 'all', label: `Todos (${futurePlanItems.length})` },
                    {
                      value: 'crane',
                      label: `Con grúa (${futureCraneItems.length})`,
                      icon: 'crane',
                    },
                    { value: 'no_crane', label: `Sin grúa (${futureNoCraneItems.length})` },
                  ]}
                />
                {filteredFutureItems.length === 0 ? (
                  <Text variant="bodySmall" style={styles.itemDescription}>
                    No hay viajes futuros
                    {craneFilter === 'crane'
                      ? ' que requieran grúa.'
                      : craneFilter === 'no_crane'
                        ? ' sin grúa.'
                        : ' planificados.'}
                  </Text>
                ) : (
                  <Pressable
                    style={styles.rangeComplianceRow}
                    onPress={() =>
                      openDetail(
                        `Viajes futuros${
                          craneFilter === 'crane'
                            ? ' · con grúa'
                            : craneFilter === 'no_crane'
                              ? ' · sin grúa'
                              : ''
                        } (${filteredFutureItems.length})`,
                        filteredFutureItems,
                      )
                    }
                  >
                    <Text variant="displaySmall" style={{ color: PALETTE.primary }}>
                      {filteredFutureItems.length}
                    </Text>
                    <Text variant="labelMedium">Toca para ver el detalle</Text>
                  </Pressable>
                )}
              </Card.Content>
            </Card>

            <Text variant="titleMedium" style={styles.groupTitle}>
              Rango personalizado
            </Text>
            <Card style={styles.wideCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Elegir rango
                </Text>
                <View style={styles.rangePickerRow}>
                  <Pressable
                    onPress={() => setRangePickerVisible(true)}
                    style={styles.rangePickerButton}
                  >
                    <MaterialCommunityIcons
                      name="calendar-range"
                      size={20}
                      color={PALETTE.primary}
                    />
                    <Text variant="bodyMedium" style={styles.rangePickerText}>
                      {customRange
                        ? `${format(new Date(customRange.start), 'dd-MM-yyyy')} — ${format(new Date(customRange.end), 'dd-MM-yyyy')}`
                        : 'Elegir rango de fechas'}
                    </Text>
                  </Pressable>
                  {customRange && (
                    <IconButton icon="close" size={18} onPress={() => setCustomRange(null)} />
                  )}
                </View>

                {customRange &&
                  (customRangeItems.length === 0 && customRangeUnplannedArrivals.length === 0 ? (
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      No hay viajes planificados ni registrados en este rango.
                    </Text>
                  ) : (
                    <Pressable
                      style={styles.rangeComplianceRow}
                      onPress={() =>
                        openDetail(
                          `${format(new Date(customRange.start), 'dd-MM-yyyy')} — ${format(new Date(customRange.end), 'dd-MM-yyyy')} (${customRangeItems.length})`,
                          customRangeItems,
                        )
                      }
                    >
                      <Text
                        variant="displaySmall"
                        style={{ color: getComplianceColor(customRangeCompliance) }}
                      >
                        {customRangeCompliance === null ? '—' : `${customRangeCompliance}%`}
                      </Text>
                      <Text variant="labelMedium">Cumplimiento del rango</Text>
                    </Pressable>
                  ))}
              </Card.Content>
            </Card>

            {customRange && (
              <Card style={styles.wideCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Cumplimiento del rango por día
                  </Text>
                  {customRangeComplianceByDay.length === 0 ? (
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      El rango elegido es muy amplio para mostrarlo día por día (máximo{' '}
                      {MAX_RANGE_DAYS} días).
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View
                        style={{ width: Math.max(300, customRangeComplianceByDay.length * 44) }}
                      >
                        <WeekBarChart
                          data={customRangeComplianceByDay.map((day) => ({
                            ...day,
                            onPress: () =>
                              openDetail(
                                `${day.label} — ${day.items.length} planificados${
                                  day.unplannedCount > 0
                                    ? ` (+${day.unplannedCount} ${getUnplannedCountLabel(effectiveScope)})`
                                    : ''
                                }`,
                                day.items,
                              ),
                          }))}
                        />
                      </View>
                    </ScrollView>
                  )}
                </Card.Content>
              </Card>
            )}

            {customRange && (
              <Card style={styles.wideCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Distribución del rango
                  </Text>
                  {customRangeItems.length === 0 && customRangeUnplannedArrivals.length === 0 ? (
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      No hay viajes planificados ni registrados en este rango.
                    </Text>
                  ) : (
                    <View style={styles.donutRow}>
                      <DonutChart
                        segments={EXTENDED_STATUS_ORDER.map((status) => ({
                          key: status,
                          value:
                            status === 'out_of_plan'
                              ? customRangeUnplannedArrivals.length
                              : (customRangeStatusCounts.get(status) ?? 0),
                          color: EXTENDED_STATUS_COLORS[status],
                        }))}
                        centerValue={String(
                          customRangeItems.length + customRangeUnplannedArrivals.length,
                        )}
                        centerLabel={
                          customRangeItems.length + customRangeUnplannedArrivals.length === 1
                            ? 'viaje'
                            : 'viajes'
                        }
                      />
                      <View style={styles.legend}>
                        {EXTENDED_STATUS_ORDER.map((status) => (
                          <Pressable
                            key={status}
                            style={styles.legendRow}
                            onPress={() => {
                              if (status === 'out_of_plan') {
                                openUnplannedDetail(
                                  `${getUnplannedLabel(effectiveScope)} · rango`,
                                  customRangeUnplannedArrivals,
                                );
                                return;
                              }
                              openDetail(
                                `${EXTENDED_STATUS_LABELS[status]} · rango`,
                                customRangeItems.filter(
                                  (item) =>
                                    getDisplayStatus(item, arrivalsByPlanItem.get(item.id), now) ===
                                    status,
                                ),
                              );
                            }}
                          >
                            <View
                              style={[
                                styles.legendDot,
                                { backgroundColor: EXTENDED_STATUS_COLORS[status] },
                              ]}
                            />
                            <Text variant="bodyMedium" style={styles.legendLabel}>
                              {getExtendedStatusLabel(status, effectiveScope)}
                            </Text>
                            <Text variant="bodyMedium" style={styles.legendCount}>
                              {status === 'out_of_plan'
                                ? customRangeUnplannedArrivals.length
                                : (customRangeStatusCounts.get(status) ?? 0)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

            {customRange && (
              <Card style={styles.wideCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Destinos de las cargas · rango
                  </Text>
                  {customRangeItemsBySite.length === 0 ? (
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      No hay viajes planificados en este rango.
                    </Text>
                  ) : (
                    <View style={styles.donutRow}>
                      <DonutChart
                        segments={customRangeItemsBySite.map((entry, index) => ({
                          key: String(entry.siteId),
                          value: entry.count,
                          color: SITE_CHART_COLORS[index % SITE_CHART_COLORS.length],
                        }))}
                        centerValue={String(customRangeItems.length)}
                        centerLabel={customRangeItems.length === 1 ? 'viaje' : 'viajes'}
                      />
                      <View style={styles.legend}>
                        {customRangeItemsBySite.map((entry, index) => (
                          <Pressable
                            key={entry.siteId}
                            style={styles.legendRow}
                            onPress={() =>
                              openDetail(
                                `${siteName(entry.siteId)} · rango (${entry.count})`,
                                customRangeItems.filter((item) => item.siteId === entry.siteId),
                              )
                            }
                          >
                            <View
                              style={[
                                styles.legendDot,
                                {
                                  backgroundColor:
                                    SITE_CHART_COLORS[index % SITE_CHART_COLORS.length],
                                },
                              ]}
                            />
                            <Text variant="bodyMedium" style={styles.legendLabel}>
                              {siteName(entry.siteId)}
                            </Text>
                            <Text variant="bodyMedium" style={styles.legendCount}>
                              {entry.count}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

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
                {agendaScope === 'day'
                  ? `Viajes ${getUnplannedCountLabel(effectiveScope)} de hoy`
                  : `Viajes ${getUnplannedCountLabel(effectiveScope)} de la semana`}
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

      <DatePickerModal
        locale="es"
        mode="range"
        visible={rangePickerVisible}
        startDate={customRange ? new Date(customRange.start) : undefined}
        endDate={customRange ? new Date(customRange.end) : undefined}
        onDismiss={() => setRangePickerVisible(false)}
        onConfirm={({ startDate, endDate }) => {
          setRangePickerVisible(false);
          if (startDate && endDate) {
            setCustomRange({
              start: startOfDay(startDate.getTime()),
              end: startOfDay(endDate.getTime()),
            });
          }
        }}
      />

      <Portal>
        <Dialog
          visible={detail !== null}
          onDismiss={() => setDetail(null)}
          style={styles.detailDialog}
        >
          <Dialog.Title>{detail?.title}</Dialog.Title>
          <Dialog.ScrollArea style={styles.detailScrollArea}>
            <ScrollView contentContainerStyle={styles.detailScrollContent}>
              {detail?.kind === 'items' &&
                (detail.items.length === 0 ? (
                  <Text style={styles.itemDescription}>No hay viajes en este grupo.</Text>
                ) : (
                  detail.items.map((item) => renderPlanItemCard(item, true))
                ))}
              {detail?.kind === 'unplanned' &&
                (detail.arrivals.length === 0 ? (
                  <Text style={styles.itemDescription}>
                    No hay cargas fuera de plan en este grupo.
                  </Text>
                ) : (
                  detail.arrivals.map((arrival) => (
                    <Card key={arrival.id} style={styles.itemCard}>
                      <Card.Content>
                        <Text variant="bodyMedium">{siteName(arrival.siteId)}</Text>
                        <Text variant="bodySmall" style={styles.itemDescription}>
                          Llegó{' '}
                          {format(new Date(arrival.arrivedAt), 'EEE dd-MM HH:mm', { locale: es })}
                        </Text>
                      </Card.Content>
                    </Card>
                  ))
                ))}
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
  dashboardTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  scopeToggle: {
    marginBottom: 12,
  },
  dateHeader: {
    marginBottom: 0,
  },
  weekLabel: {
    opacity: 0.7,
    marginBottom: 12,
  },
  groupTitle: {
    fontWeight: '700',
    color: PALETTE.primary,
    marginTop: 20,
    marginBottom: 8,
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
  rangePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rangePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingVertical: 8,
  },
  rangePickerText: {
    color: PALETTE.primary,
  },
  rangeComplianceRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  craneFilterToggle: {
    marginBottom: 4,
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
