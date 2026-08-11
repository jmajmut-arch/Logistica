import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, SectionList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  FAB,
  IconButton,
  Portal,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { HeavyCraneBadge } from '@/components/HeavyCraneBadge';
import { MonthCalendar } from '@/components/MonthCalendar';
import { RoleGate } from '@/components/RoleGate';
import { carrierRepository } from '@/data/repositories/carrierRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { ensureRecurringPlanOccurrences } from '@/domain/services/recurringPlanSync';
import { PALETTE } from '@/theme';
import { matchesOperatorScope } from '@/utils/operatorScope';
import { getWeekNumber, startOfDay, startOfToday } from '@/utils/timeBlocks';
import {
  OPERATION_TYPE_COLORS,
  OPERATION_TYPE_ICONS,
  OPERATION_TYPE_LABELS,
} from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import { usePlanScope } from './PlanScopeContext';
import type { TransportPlanStackParamList } from './TransportPlanStack';

type Navigation = NativeStackNavigationProp<TransportPlanStackParamList, 'TransportPlanList'>;

type DaySection = { day: number; title: string; data: TransportPlanItem[] };

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TransportPlanListScreen() {
  const navigation = useNavigation<Navigation>();
  const planManagerScope = usePlanScope();
  const today = useMemo(() => startOfToday(), []);
  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [carriersById, setCarriersById] = useState<Map<number, Carrier>>(new Map());
  const [itemToDelete, setItemToDelete] = useState<TransportPlanItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(today);
  // La vista Lista muestra solo hoy por defecto — con historiales largos, agrupar y
  // renderizar todo de una es lento — y deja elegir un rango de fechas para ver otro período.
  const [customRange, setCustomRange] = useState<{ start: number; end: number } | null>(null);
  const [rangePickerVisible, setRangePickerVisible] = useState(false);

  const loadData = useCallback(async () => {
    // Reglas permanentes existen tanto para plan semanal como para home delivery, así que
    // la sincronización corre siempre, sin importar qué scope esté viendo el planificador.
    await ensureRecurringPlanOccurrences();
    const [items, sites, carriers] = await Promise.all([
      transportPlanRepository.findAll(),
      siteRepository.findAll(),
      carrierRepository.findAll(),
    ]);
    setPlanItems(items);
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
      // Una ocurrencia generada por una regla permanente no se borra de verdad: se cancela,
      // para que la sincronización (que corre justo después, en loadData) no la regenere al
      // ver esa semana "libre" otra vez. Un item suelto (sin regla) sí se borra directamente.
      if (itemToDelete.recurrenceRuleId !== null) {
        await transportPlanRepository.cancel(itemToDelete.id);
      } else {
        await transportPlanRepository.delete(itemToDelete.id);
      }
      setItemToDelete(null);
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  const scopedPlanItems = useMemo(
    () => (planItems ?? []).filter((item) => matchesOperatorScope(item.operationType, planManagerScope)),
    [planItems, planManagerScope],
  );

  // Una sola pasada para agrupar por día (en vez de un filter() del arreglo completo por
  // cada día distinto): con historiales largos esto era O(días × items).
  const { countsByDay, craneDays, itemsByDay } = useMemo(() => {
    const counts = new Map<number, number>();
    const crane = new Set<number>();
    const byDay = new Map<number, TransportPlanItem[]>();
    for (const item of scopedPlanItems) {
      const day = startOfDay(item.scheduledAt);
      counts.set(day, (counts.get(day) ?? 0) + 1);
      if (item.requiresHeavyCrane) {
        crane.add(day);
      }
      const dayItems = byDay.get(day);
      if (dayItems) {
        dayItems.push(item);
      } else {
        byDay.set(day, [item]);
      }
    }
    return { countsByDay: counts, craneDays: crane, itemsByDay: byDay };
  }, [scopedPlanItems]);

  // Sin rango elegido, la Lista solo muestra hoy; con rango, todos los días con plan
  // dentro de ese rango (acotado por lo que realmente hay datos, no por recorrer el rango
  // día a día).
  const relevantDays = useMemo(() => {
    if (customRange) {
      return Array.from(itemsByDay.keys()).filter(
        (day) => day >= customRange.start && day <= customRange.end,
      );
    }
    return itemsByDay.has(today) ? [today] : [];
  }, [itemsByDay, customRange, today]);

  const daySections: DaySection[] = useMemo(
    () =>
      relevantDays
        .slice()
        .sort((a, b) => a - b)
        .map((day) => ({
          day,
          title: `${capitalize(format(new Date(day), "EEEE dd 'de' MMMM", { locale: es }))} · Semana ${getWeekNumber(day)}`,
          data: [...(itemsByDay.get(day) ?? [])].sort((a, b) => a.scheduledAt - b.scheduledAt),
        })),
    [relevantDays, itemsByDay],
  );

  const selectedDayItems = useMemo(
    () =>
      (itemsByDay.get(selectedDay) ?? []).slice().sort((a, b) => a.scheduledAt - b.scheduledAt),
    [itemsByDay, selectedDay],
  );

  if (planItems === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderPlanItem = (item: TransportPlanItem) => {
    const site = sitesById.get(item.siteId);
    const carrier = item.carrierId !== null ? carriersById.get(item.carrierId) : undefined;
    const color = OPERATION_TYPE_COLORS[item.operationType];
    return (
      <Card
        style={styles.itemCard}
        onPress={() => navigation.navigate('TransportPlanForm', { planItemId: item.id })}
      >
        <Card.Content style={styles.itemContent}>
          <View style={[styles.accentBar, { backgroundColor: color }]} />
          <View style={styles.timeColumn}>
            {item.hasNoSchedule ? (
              <Text variant="labelMedium" style={styles.noScheduleLabel}>
                Sin{'\n'}horario
              </Text>
            ) : (
              <Text variant="titleMedium">{format(new Date(item.scheduledAt), 'HH:mm')}</Text>
            )}
          </View>
          <View style={styles.itemBody}>
            <View style={styles.itemTitleRow}>
              <MaterialCommunityIcons
                name={OPERATION_TYPE_ICONS[item.operationType] as keyof typeof MaterialCommunityIcons.glyphMap}
                size={16}
                color={color}
              />
              <Text variant="bodyMedium" style={styles.itemTitle}>
                {OPERATION_TYPE_LABELS[item.operationType]}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.itemDetail}>
              {site ? site.name : `Sitio #${item.siteId}`}
            </Text>
            {carrier && (
              <Text variant="bodySmall" style={styles.itemDetail}>
                {carrier.name}
              </Text>
            )}
            {item.reference && (
              <Text variant="bodySmall" style={styles.itemDetail} numberOfLines={1}>
                {item.reference}
              </Text>
            )}
          </View>
          <View style={styles.itemActions}>
            {item.requiresHeavyCrane && <HeavyCraneBadge compact />}
            <RoleGate permission="managePlan">
              <IconButton icon="delete-outline" size={20} onPress={() => setItemToDelete(item)} />
            </RoleGate>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const viewToggle = (
    <SegmentedButtons
      style={styles.viewToggle}
      value={viewMode}
      onValueChange={(value) => setViewMode(value as 'list' | 'calendar')}
      buttons={[
        { value: 'list', label: 'Lista', icon: 'format-list-bulleted' },
        { value: 'calendar', label: 'Calendario', icon: 'calendar-month-outline' },
      ]}
    />
  );

  const emptyState = (
    <EmptyState
      icon="calendar-blank-outline"
      message={
        viewMode === 'calendar'
          ? 'No hay nada planificado este día.'
          : customRange
            ? 'No hay nada planificado en este rango.'
            : 'No hay nada planificado para hoy.'
      }
    />
  );

  const rangePicker = (
    <View style={styles.rangePickerRow}>
      <Pressable onPress={() => setRangePickerVisible(true)} style={styles.rangePickerButton}>
        <MaterialCommunityIcons name="calendar-range" size={20} color={PALETTE.primary} />
        <Text variant="bodyMedium" style={styles.rangePickerText}>
          {customRange
            ? `${format(new Date(customRange.start), 'dd-MM-yyyy')} — ${format(new Date(customRange.end), 'dd-MM-yyyy')}`
            : 'Ver rango de fechas'}
        </Text>
      </Pressable>
      {customRange && <IconButton icon="close" size={18} onPress={() => setCustomRange(null)} />}
    </View>
  );

  return (
    <View style={styles.container}>
      {viewMode === 'calendar' ? (
        <FlatList
          data={selectedDayItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            selectedDayItems.length === 0 && styles.emptyContainer,
          ]}
          ListHeaderComponent={
            <View>
              {viewToggle}
              <MonthCalendar
                month={visibleMonth}
                onChangeMonth={(delta) =>
                  setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
                }
                countsByDay={countsByDay}
                craneDays={craneDays}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                today={today}
              />
              <Text variant="titleMedium" style={styles.selectedDayTitle}>
                {capitalize(format(new Date(selectedDay), "EEEE dd 'de' MMMM", { locale: es }))}
              </Text>
            </View>
          }
          ListEmptyComponent={emptyState}
          renderItem={({ item }) => renderPlanItem(item)}
        />
      ) : (
        <SectionList
          sections={daySections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled
          contentContainerStyle={[styles.listContent, daySections.length === 0 && styles.emptyContainer]}
          ListHeaderComponent={
            <View>
              {viewToggle}
              {rangePicker}
            </View>
          }
          ListEmptyComponent={emptyState}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text variant="titleSmall" style={styles.sectionHeaderText}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => renderPlanItem(item)}
        />
      )}
      <RoleGate permission="managePlan">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('TransportPlanForm')}
        />
      </RoleGate>

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
            setCustomRange({ start: startOfDay(startDate.getTime()), end: startOfDay(endDate.getTime()) });
          }
        }}
      />

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
  listContent: {
    paddingBottom: 88,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  viewToggle: {
    margin: 16,
    marginBottom: 8,
  },
  selectedDayTitle: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionHeader: {
    backgroundColor: PALETTE.background,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    color: PALETTE.textMuted,
  },
  rangePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 16,
    marginBottom: 8,
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
  itemCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  timeColumn: {
    width: 56,
  },
  noScheduleLabel: {
    opacity: 0.7,
    lineHeight: 16,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontWeight: '600',
  },
  itemDetail: {
    opacity: 0.7,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
