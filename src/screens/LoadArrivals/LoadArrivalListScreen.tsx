import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Text,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { HeavyCraneBadge } from '@/components/HeavyCraneBadge';
import { PlanItemStatusBadge } from '@/components/PlanItemStatusBadge';
import { RoleGate } from '@/components/RoleGate';
import { carrierRepository } from '@/data/repositories/carrierRepository';
import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import { userRepository } from '@/data/repositories/userRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import type { User } from '@/domain/entities/User';
import { getDisplayStatus, getPlanItemStatus } from '@/domain/rules/complianceStatus';
import { useSessionStore } from '@/store/sessionStore';
import { PALETTE } from '@/theme';
import { matchesOperatorScope } from '@/utils/operatorScope';
import { startOfToday } from '@/utils/timeBlocks';
import {
  DISPLAY_STATUS_COLORS,
  getComplianceColor,
  getUnplannedLabel,
  OPERATION_TYPE_LABELS,
} from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { LoadArrivalsStackParamList } from './LoadArrivalsStack';

type Navigation = NativeStackNavigationProp<LoadArrivalsStackParamList, 'LoadArrivalList'>;

const DAY_MS = 24 * 60 * 60 * 1000;

export function LoadArrivalListScreen() {
  const navigation = useNavigation<Navigation>();
  const currentSiteId = useSessionStore((state) => state.currentSiteId);
  const currentOperatorScope = useSessionStore((state) => state.currentOperatorScope);
  const [arrivals, setArrivals] = useState<LoadArrival[] | null>(null);
  const [planItems, setPlanItems] = useState<TransportPlanItem[]>([]);
  const [planItemsById, setPlanItemsById] = useState<Map<number, TransportPlanItem>>(new Map());
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [carriersById, setCarriersById] = useState<Map<number, Carrier>>(new Map());
  const [usersById, setUsersById] = useState<Map<number, User>>(new Map());
  const [arrivalToDelete, setArrivalToDelete] = useState<LoadArrival | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [loadedArrivals, loadedPlanItems, sites, carriers, users] = await Promise.all([
      loadArrivalRepository.findAll(),
      transportPlanRepository.findAll(),
      siteRepository.findAll(),
      carrierRepository.findAll(),
      userRepository.findAll(),
    ]);
    setArrivals(loadedArrivals);
    setPlanItems(loadedPlanItems);
    setPlanItemsById(new Map(loadedPlanItems.map((item) => [item.id, item])));
    setSitesById(new Map(sites.map((site) => [site.id, site])));
    setCarriersById(new Map(carriers.map((carrier) => [carrier.id, carrier])));
    setUsersById(new Map(users.map((user) => [user.id, user])));
  }, []);

  useFocusRefresh(loadData);

  const dayStart = useMemo(() => startOfToday(), []);
  const dayEnd = dayStart + DAY_MS;

  const registeredPlanItemIds = useMemo(
    () =>
      new Set(
        (arrivals ?? []).map((arrival) => arrival.planItemId).filter((id): id is number => id !== null),
      ),
    [arrivals],
  );

  const arrivalsByPlanItem = useMemo(() => {
    const map = new Map<number, LoadArrival>();
    for (const arrival of arrivals ?? []) {
      if (arrival.planItemId !== null) {
        map.set(arrival.planItemId, arrival);
      }
    }
    return map;
  }, [arrivals]);

  // Todo lo planificado hoy para el sitio/frente de trabajo del operador, sin importar si
  // ya se registró, sigue pendiente o se canceló — para el resumen de estadísticas del día.
  const todayItemsForSite = useMemo(() => {
    if (currentSiteId === null) {
      return [];
    }
    return planItems.filter(
      (item) =>
        item.siteId === currentSiteId &&
        item.scheduledAt >= dayStart &&
        item.scheduledAt < dayEnd &&
        matchesOperatorScope(item.operationType, currentOperatorScope),
    );
  }, [planItems, currentSiteId, dayStart, dayEnd, currentOperatorScope]);

  const todayStats = useMemo(() => {
    let executed = 0;
    let pending = 0;
    let cancelled = 0;
    let onTime = 0;
    for (const item of todayItemsForSite) {
      const arrival = arrivalsByPlanItem.get(item.id);
      if (arrival) {
        executed += 1;
        if (getDisplayStatus(item, arrival) === 'on_time') {
          onTime += 1;
        }
      } else if (item.cancelledByOperator) {
        cancelled += 1;
      } else {
        pending += 1;
      }
    }
    const total = todayItemsForSite.length;
    return {
      total,
      executed,
      pending,
      cancelled,
      compliancePct: total === 0 ? null : Math.round((onTime / total) * 100),
    };
  }, [todayItemsForSite, arrivalsByPlanItem]);

  const unregisteredTodayForSite = useMemo(() => {
    if (currentSiteId === null) {
      return [];
    }
    return planItems
      .filter(
        (item) =>
          item.siteId === currentSiteId &&
          item.scheduledAt >= dayStart &&
          item.scheduledAt < dayEnd &&
          !registeredPlanItemIds.has(item.id) &&
          matchesOperatorScope(item.operationType, currentOperatorScope),
      )
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [planItems, currentSiteId, dayStart, dayEnd, registeredPlanItemIds, currentOperatorScope]);

  // Separados de los pendientes accionables: si se mezclan en la misma lista, el título
  // "Pendientes de hoy" deja de calzar con el conteo real de pendientes del resumen (un
  // cancelado ya no es "pendiente", solo queda como registro).
  const pendingItemsForSite = useMemo(
    () => unregisteredTodayForSite.filter((item) => !item.cancelledByOperator),
    [unregisteredTodayForSite],
  );
  const cancelledTodayForSite = useMemo(
    () =>
      unregisteredTodayForSite
        .filter((item) => item.cancelledByOperator)
        .sort((a, b) => (b.cancelledAt ?? 0) - (a.cancelledAt ?? 0)),
    [unregisteredTodayForSite],
  );

  // Igual que "Pendientes de hoy": el operador solo debe ver lo ya registrado de su propio
  // patio/bodega y del día de hoy, no el historial completo de todos los sitios.
  const registeredTodayForSite = useMemo(() => {
    if (currentSiteId === null) {
      return [];
    }
    return (arrivals ?? [])
      .filter(
        (arrival) =>
          arrival.siteId === currentSiteId &&
          arrival.arrivedAt >= dayStart &&
          arrival.arrivedAt < dayEnd,
      )
      .sort((a, b) => b.arrivedAt - a.arrivedAt);
  }, [arrivals, currentSiteId, dayStart, dayEnd]);

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
        parts.push(
          planItem.hasNoSchedule
            ? 'Sin horario planificado'
            : `Planificado ${format(new Date(planItem.scheduledAt), 'HH:mm')}`,
        );
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
        data={registeredTodayForSite}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <RoleGate permission="registerArrivals">
            <View>
              {currentSiteId !== null && (
                <Card style={styles.statsCard}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.cardTitle}>
                      Resumen de hoy
                    </Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text variant="headlineSmall">{todayStats.total}</Text>
                        <Text variant="labelSmall" style={styles.statLabel}>
                          Planificados
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text variant="headlineSmall" style={{ color: DISPLAY_STATUS_COLORS.on_time }}>
                          {todayStats.executed}
                        </Text>
                        <Text variant="labelSmall" style={styles.statLabel}>
                          Ejecutados
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text variant="headlineSmall" style={{ color: DISPLAY_STATUS_COLORS.overdue }}>
                          {todayStats.pending}
                        </Text>
                        <Text variant="labelSmall" style={styles.statLabel}>
                          Pendientes
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text variant="headlineSmall" style={{ color: DISPLAY_STATUS_COLORS.cancelled }}>
                          {todayStats.cancelled}
                        </Text>
                        <Text variant="labelSmall" style={styles.statLabel}>
                          Cancelados
                        </Text>
                      </View>
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={[styles.complianceLine, { color: getComplianceColor(todayStats.compliancePct) }]}
                    >
                      Cumplimiento hoy:{' '}
                      {todayStats.compliancePct === null ? '—' : `${todayStats.compliancePct}%`}
                    </Text>
                  </Card.Content>
                </Card>
              )}

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Pendientes de hoy
              </Text>
              {currentSiteId === null ? (
                <Text style={styles.emptyPending}>
                  No tienes un sitio asignado. Elígelo desde el ícono de ubicación arriba.
                </Text>
              ) : pendingItemsForSite.length === 0 ? (
                <Text style={styles.emptyPending}>
                  {unregisteredTodayForSite.length === 0
                    ? 'Ya registraste todo lo planificado para hoy.'
                    : 'Ya no queda nada pendiente por registrar hoy.'}
                </Text>
              ) : (
                pendingItemsForSite.map((item) => {
                  const carrier = item.carrierId !== null ? carriersById.get(item.carrierId) : undefined;
                  return (
                    <Card
                      key={item.id}
                      style={styles.pendingCard}
                      onPress={() => navigation.navigate('LoadArrivalForm', { planItemId: item.id })}
                    >
                      <Card.Content style={styles.pendingContent}>
                        <View style={styles.pendingTime}>
                          <Text variant={item.hasNoSchedule ? 'bodySmall' : 'titleMedium'}>
                            {item.hasNoSchedule ? 'Sin horario' : format(new Date(item.scheduledAt), 'HH:mm')}
                          </Text>
                        </View>
                        <View style={styles.pendingText}>
                          <Text variant="bodyMedium">{OPERATION_TYPE_LABELS[item.operationType]}</Text>
                          {carrier && (
                            <Text variant="bodySmall" style={styles.pendingDetail}>
                              {carrier.name}
                            </Text>
                          )}
                          {item.requiresHeavyCrane && <HeavyCraneBadge />}
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={22} color={PALETTE.textMuted} />
                      </Card.Content>
                    </Card>
                  );
                })
              )}
              {currentSiteId !== null && (
                <Card
                  style={styles.pendingCard}
                  onPress={() => navigation.navigate('LoadArrivalForm', { openUnplanned: true })}
                >
                  <Card.Content style={styles.pendingContent}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={24} color={PALETTE.primary} />
                    <View style={styles.pendingText}>
                      <Text variant="bodyMedium">{getUnplannedLabel(currentOperatorScope)}</Text>
                      <Text variant="bodySmall" style={styles.pendingDetail}>
                        Llegó algo que no estaba en el plan
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              )}

              {cancelledTodayForSite.length > 0 && (
                <>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Cancelados hoy
                  </Text>
                  {cancelledTodayForSite.map((item) => {
                    const cancelledByName =
                      item.cancelledBy !== null ? usersById.get(item.cancelledBy)?.name : undefined;
                    return (
                      <Card key={item.id} style={[styles.pendingCard, styles.cancelledCard]}>
                        <Card.Content style={styles.pendingContent}>
                          <View style={styles.pendingTime}>
                            <Text
                              variant={item.hasNoSchedule ? 'bodySmall' : 'titleMedium'}
                              style={styles.cancelledLabel}
                            >
                              {item.hasNoSchedule
                                ? 'Sin horario'
                                : format(new Date(item.scheduledAt), 'HH:mm')}
                            </Text>
                          </View>
                          <View style={styles.pendingText}>
                            <Text variant="bodyMedium">{OPERATION_TYPE_LABELS[item.operationType]}</Text>
                            <Text variant="bodySmall" style={styles.cancelledLabel}>
                              Cancelado por {cancelledByName ?? 'operador'}
                              {item.cancelledAt
                                ? ` · ${format(new Date(item.cancelledAt), 'dd-MM HH:mm')}`
                                : ''}
                            </Text>
                          </View>
                          <MaterialCommunityIcons
                            name="close-circle-outline"
                            size={22}
                            color={DISPLAY_STATUS_COLORS.cancelled}
                          />
                        </Card.Content>
                      </Card>
                    );
                  })}
                </>
              )}

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Registradas hoy
              </Text>
              {registeredTodayForSite.length === 0 && (
                <EmptyState
                  icon="package-variant-closed"
                  message="No hay llegadas de carga registradas hoy en este sitio."
                />
              )}
            </View>
          </RoleGate>
        }
        renderItem={({ item }) => {
          const planItem = item.planItemId !== null ? planItemsById.get(item.planItemId) : undefined;
          return (
            <List.Item
              title={
                planItem
                  ? OPERATION_TYPE_LABELS[planItem.operationType]
                  : getUnplannedLabel(currentOperatorScope)
              }
              description={describe(item, planItem)}
              left={(props) => <List.Icon {...props} icon="package-variant-closed" />}
              onPress={() => navigation.navigate('LoadArrivalForm', { arrivalId: item.id })}
              right={() => (
                <View style={styles.rightActions}>
                  {planItem?.requiresHeavyCrane && <HeavyCraneBadge compact />}
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
  listContent: {
    paddingBottom: 88,
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardTitle: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    opacity: 0.7,
    textAlign: 'center',
  },
  complianceLine: {
    marginTop: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPending: {
    marginHorizontal: 16,
    marginBottom: 8,
    opacity: 0.7,
  },
  pendingCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  pendingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingTime: {
    width: 56,
  },
  pendingText: {
    flex: 1,
    gap: 2,
  },
  pendingDetail: {
    opacity: 0.7,
  },
  cancelledCard: {
    borderLeftWidth: 3,
    borderLeftColor: DISPLAY_STATUS_COLORS.cancelled,
    opacity: 0.85,
  },
  cancelledLabel: {
    color: DISPLAY_STATUS_COLORS.cancelled,
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
