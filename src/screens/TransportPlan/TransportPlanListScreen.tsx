import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
  SegmentedButtons,
  Text,
} from 'react-native-paper';

import { EmptyState } from '@/components/EmptyState';
import { HeavyCraneBadge } from '@/components/HeavyCraneBadge';
import { MonthCalendar } from '@/components/MonthCalendar';
import { RoleGate } from '@/components/RoleGate';
import { carrierRepository } from '@/data/repositories/carrierRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import { userRepository } from '@/data/repositories/userRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import type { User } from '@/domain/entities/User';
import { ensureRecurringPlanOccurrences } from '@/domain/services/recurringPlanSync';
import { useSessionStore } from '@/store/sessionStore';
import { getPlanManagerScope, matchesOperatorScope } from '@/utils/operatorScope';
import { getWeekNumber, startOfDay, startOfToday } from '@/utils/timeBlocks';
import { OPERATION_TYPE_LABELS } from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { TransportPlanStackParamList } from './TransportPlanStack';

type Navigation = NativeStackNavigationProp<TransportPlanStackParamList, 'TransportPlanList'>;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function TransportPlanListScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);
  const planManagerScope = getPlanManagerScope(currentUser?.role);
  const today = useMemo(() => startOfToday(), []);
  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [usersById, setUsersById] = useState<Map<number, User>>(new Map());
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [carriersById, setCarriersById] = useState<Map<number, Carrier>>(new Map());
  const [itemToDelete, setItemToDelete] = useState<TransportPlanItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(today);

  const loadData = useCallback(async () => {
    if (planManagerScope === 'home_delivery') {
      await ensureRecurringPlanOccurrences();
    }
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
  }, [planManagerScope]);

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
        item.hasNoSchedule
          ? `${format(new Date(item.scheduledAt), 'dd-MM-yyyy')} · Sin horario`
          : format(new Date(item.scheduledAt), 'dd-MM-yyyy HH:mm'),
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

  const scopedPlanItems = planItems.filter((item) =>
    matchesOperatorScope(item.operationType, planManagerScope),
  );

  const countsByDay = new Map<number, number>();
  for (const item of scopedPlanItems) {
    const day = startOfDay(item.scheduledAt);
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }

  const selectedDayItems = scopedPlanItems
    .filter((item) => startOfDay(item.scheduledAt) === selectedDay)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);

  const listData = viewMode === 'list' ? scopedPlanItems : selectedDayItems;

  const renderPlanItem = (item: TransportPlanItem) => (
    <List.Item
      title={OPERATION_TYPE_LABELS[item.operationType]}
      description={describe(item)}
      descriptionNumberOfLines={2}
      left={(props) => <List.Icon {...props} icon="calendar-clock-outline" />}
      onPress={() => navigation.navigate('TransportPlanForm', { planItemId: item.id })}
      right={() => (
        <View style={styles.rightRow}>
          {item.requiresHeavyCrane && <HeavyCraneBadge compact />}
          <RoleGate permission="managePlan">
            <IconButton icon="delete-outline" onPress={() => setItemToDelete(item)} />
          </RoleGate>
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={listData.length === 0 && styles.emptyContainer}
        ListHeaderComponent={
          <View>
            <SegmentedButtons
              style={styles.viewToggle}
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'list' | 'calendar')}
              buttons={[
                { value: 'list', label: 'Lista', icon: 'format-list-bulleted' },
                { value: 'calendar', label: 'Calendario', icon: 'calendar-month-outline' },
              ]}
            />
            {viewMode === 'calendar' && (
              <>
                <MonthCalendar
                  month={visibleMonth}
                  onChangeMonth={(delta) =>
                    setVisibleMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
                    )
                  }
                  countsByDay={countsByDay}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  today={today}
                />
                <Text variant="titleMedium" style={styles.selectedDayTitle}>
                  {capitalize(format(new Date(selectedDay), "EEEE dd 'de' MMMM", { locale: es }))}
                </Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-blank-outline"
            message={
              viewMode === 'calendar'
                ? 'No hay nada planificado este día.'
                : planManagerScope === 'home_delivery'
                  ? 'No hay items en el plan de home delivery todavía.'
                  : 'No hay items en el plan de transporte todavía.'
            }
          />
        }
        renderItem={({ item }) => renderPlanItem(item)}
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
  viewToggle: {
    margin: 16,
    marginBottom: 8,
  },
  selectedDayTitle: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  rightRow: {
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
