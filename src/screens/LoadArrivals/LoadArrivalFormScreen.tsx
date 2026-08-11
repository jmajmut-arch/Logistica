import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Dialog,
  Divider,
  HelperText,
  List,
  Menu,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HeavyCraneBadge } from '@/components/HeavyCraneBadge';
import { carrierRepository } from '@/data/repositories/carrierRepository';
import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { Carrier } from '@/domain/entities/Carrier';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { useSessionStore } from '@/store/sessionStore';
import { PALETTE } from '@/theme';
import { matchesOperatorScope } from '@/utils/operatorScope';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import {
  blockMinutesOf,
  combineDayAndBlock,
  startOfDay,
  startOfToday,
  TIME_BLOCKS,
} from '@/utils/timeBlocks';
import {
  DISPLAY_STATUS_COLORS,
  getUnplannedLabel,
  OPERATION_TYPE_LABELS,
} from '@/utils/transportPlanDisplay';

import type { LoadArrivalsStackParamList } from './LoadArrivalsStack';

type Navigation = NativeStackNavigationProp<LoadArrivalsStackParamList, 'LoadArrivalForm'>;

const DAY_MS = 24 * 60 * 60 * 1000;

type ActiveSelection = TransportPlanItem | 'unplanned';

export function LoadArrivalFormScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<LoadArrivalsStackParamList, 'LoadArrivalForm'>>();
  const arrivalId = route.params?.arrivalId;
  const currentUser = useSessionStore((state) => state.currentUser);
  const currentSiteId = useSessionStore((state) => state.currentSiteId);
  const currentOperatorScope = useSessionStore((state) => state.currentOperatorScope);

  const [sites, setSites] = useState<Site[] | null>(null);
  const [carriers, setCarriers] = useState<Carrier[] | null>(null);
  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [arrivals, setArrivals] = useState<LoadArrival[] | null>(null);
  const [editingArrival, setEditingArrival] = useState<LoadArrival | null>(null);
  const [loading, setLoading] = useState(arrivalId !== undefined);
  const siteId = arrivalId !== undefined ? (editingArrival?.siteId ?? 0) : (currentSiteId ?? 0);

  const [active, setActive] = useState<ActiveSelection | null>(null);
  const [dialogStep, setDialogStep] = useState<'choose' | 'time'>('choose');
  const [blockMinutes, setBlockMinutes] = useState(0);
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [unplannedCarrierId, setUnplannedCarrierId] = useState(0);
  const [unplannedCarrierMenuVisible, setUnplannedCarrierMenuVisible] = useState(false);
  const [unplannedCarrierError, setUnplannedCarrierError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    Promise.all([
      siteRepository.findAll(),
      carrierRepository.findAll(),
      transportPlanRepository.findAll(),
      loadArrivalRepository.findAll(),
    ]).then(([loadedSites, loadedCarriers, loadedPlanItems, loadedArrivals]) => {
      setSites(loadedSites);
      setCarriers(loadedCarriers);
      setPlanItems(loadedPlanItems);
      setArrivals(loadedArrivals);
    });
  }, []);

  useEffect(() => {
    if (arrivalId === undefined) {
      return;
    }
    loadArrivalRepository.findById(arrivalId).then((found) => {
      if (found) {
        setEditingArrival(found);
      }
      setLoading(false);
    });
  }, [arrivalId]);

  const dayStart = useMemo(() => startOfToday(), []);
  const dayEnd = dayStart + DAY_MS;

  const carriersById = useMemo(
    () => new Map((carriers ?? []).map((carrier) => [carrier.id, carrier])),
    [carriers],
  );

  const registeredPlanItemIds = useMemo(
    () =>
      new Set(
        (arrivals ?? [])
          .filter((arrival) => arrival.id !== arrivalId)
          .map((arrival) => arrival.planItemId)
          .filter((id): id is number => id !== null),
      ),
    [arrivals, arrivalId],
  );

  const pendingItemsForSite = useMemo(() => {
    if (!planItems || siteId === 0) {
      return [];
    }
    return planItems
      .filter(
        (item) =>
          item.siteId === siteId &&
          item.scheduledAt >= dayStart &&
          item.scheduledAt < dayEnd &&
          !registeredPlanItemIds.has(item.id) &&
          matchesOperatorScope(item.operationType, currentOperatorScope),
      )
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [planItems, siteId, dayStart, dayEnd, registeredPlanItemIds, currentOperatorScope]);

  // Viajes planificados para días anteriores que nunca se registraron: se muestran aparte
  // para que el operador también pueda ponerse al día, aunque la hora o el día ya pasó.
  const overduePendingItemsForSite = useMemo(() => {
    if (!planItems || siteId === 0) {
      return [];
    }
    return planItems
      .filter(
        (item) =>
          item.siteId === siteId &&
          item.scheduledAt < dayStart &&
          !registeredPlanItemIds.has(item.id) &&
          matchesOperatorScope(item.operationType, currentOperatorScope),
      )
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [planItems, siteId, dayStart, registeredPlanItemIds, currentOperatorScope]);

  const openPlanItem = (item: TransportPlanItem) => {
    setActive(item);
    setBlockMinutes(blockMinutesOf(item.scheduledAt));
    // Sin horario no hay nada que "cumplir": se salta directo a pedir la hora de llegada.
    setDialogStep(item.hasNoSchedule ? 'time' : 'choose');
  };

  const openUnplanned = () => {
    const editingUnplanned = editingArrival && editingArrival.planItemId === null ? editingArrival : null;
    setActive('unplanned');
    setDialogStep('time');
    setUnplannedCarrierError(false);
    setUnplannedCarrierId(editingUnplanned?.carrierId ?? 0);
    setBlockMinutes(
      editingUnplanned ? blockMinutesOf(editingUnplanned.arrivedAt) : blockMinutesOf(Date.now()),
    );
  };

  useEffect(() => {
    if (autoOpened || arrivalId !== undefined || planItems === null) {
      return;
    }
    const requestedPlanItemId = route.params?.planItemId;
    const shouldOpenUnplanned = route.params?.openUnplanned === true;
    if (requestedPlanItemId === undefined && !shouldOpenUnplanned) {
      return;
    }
    // Se difiere a un microtask porque estamos reaccionando a datos recién cargados
    // (no derivándolos): react-hooks/set-state-in-effect exige que el setState no sea
    // la primera acción síncrona del efecto.
    Promise.resolve().then(() => {
      if (requestedPlanItemId !== undefined) {
        const item = pendingItemsForSite.find((candidate) => candidate.id === requestedPlanItemId);
        if (!item) {
          return;
        }
        setActive(item);
        setBlockMinutes(blockMinutesOf(item.scheduledAt));
        setDialogStep(item.hasNoSchedule ? 'time' : 'choose');
        setAutoOpened(true);
        return;
      }
      setActive('unplanned');
      setDialogStep('time');
      setUnplannedCarrierError(false);
      setUnplannedCarrierId(0);
      setBlockMinutes(blockMinutesOf(Date.now()));
      setAutoOpened(true);
    });
  }, [autoOpened, arrivalId, planItems, pendingItemsForSite, route.params]);

  const closeDialog = () => {
    setActive(null);
    setDialogStep('choose');
  };

  const submit = async (arrivedAt: number, planItemId: number | null, carrierId: number | null) => {
    if (!currentUser) {
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        siteId,
        carrierId,
        arrivedAt,
        planItemId,
        registeredBy: editingArrival?.registeredBy ?? currentUser.id,
      };
      if (arrivalId !== undefined) {
        await loadArrivalRepository.update(arrivalId, payload);
      } else {
        await loadArrivalRepository.create(payload);
      }
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmOnSchedule = () => {
    if (active === null || active === 'unplanned') {
      return;
    }
    submit(active.scheduledAt, active.id, active.carrierId);
  };

  // El viaje nunca llegó: a diferencia de "Sí, cumplió" u "Otro horario", esto no crea una
  // llegada — cancela el item del plan para que deje de aparecer como pendiente.
  const cancelTrip = async () => {
    if (active === null || active === 'unplanned') {
      return;
    }
    setSubmitting(true);
    try {
      await transportPlanRepository.cancel(active.id);
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmOtherTime = () => {
    if (active === null) {
      return;
    }
    if (active === 'unplanned') {
      if (unplannedCarrierId === 0) {
        setUnplannedCarrierError(true);
        return;
      }
      submit(combineDayAndBlock(startOfToday(), blockMinutes), null, unplannedCarrierId);
      return;
    }
    submit(combineDayAndBlock(startOfDay(active.scheduledAt), blockMinutes), active.id, active.carrierId);
  };

  if (sites === null || carriers === null || planItems === null || arrivals === null || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedSite = sites.find((site) => site.id === siteId);
  const selectedBlock = TIME_BLOCKS.find((block) => block.minutes === blockMinutes);
  const selectedUnplannedCarrier = carriers.find((carrier) => carrier.id === unplannedCarrierId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {selectedSite ? (
        <View style={styles.siteBanner}>
          <MaterialCommunityIcons
            name={selectedSite.type === 'patio' ? 'texture-box' : 'warehouse'}
            size={22}
            color={PALETTE.primary}
          />
          <View>
            <Text variant="labelSmall" style={styles.siteBannerLabel}>
              Área
            </Text>
            <Text variant="bodyLarge">
              {selectedSite.name} ({SITE_TYPE_LABELS[selectedSite.type]})
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyPlan}>
          No tienes un sitio asignado. Elige uno tocando el ícono de ubicación en la parte
          superior.
        </Text>
      )}

      {siteId !== 0 && (
        <>
          {overduePendingItemsForSite.length > 0 && (
            <>
              <Text variant="bodyMedium" style={[styles.label, styles.overdueLabel]}>
                Pendientes atrasados
              </Text>
              {overduePendingItemsForSite.map((item) => {
                const carrier = item.carrierId !== null ? carriersById.get(item.carrierId) : undefined;
                return (
                  <Card
                    key={item.id}
                    style={[styles.planItemCard, styles.overdueCard]}
                    onPress={() => openPlanItem(item)}
                  >
                    <Card.Content style={styles.planItemContent}>
                      <View style={styles.planItemTimeWide}>
                        <Text variant="bodySmall" style={styles.overdueLabel}>
                          {item.hasNoSchedule
                            ? format(new Date(item.scheduledAt), 'dd-MM')
                            : format(new Date(item.scheduledAt), 'dd-MM HH:mm')}
                        </Text>
                      </View>
                      <View style={styles.planItemText}>
                        <Text variant="bodyMedium">{OPERATION_TYPE_LABELS[item.operationType]}</Text>
                        {carrier && (
                          <Text variant="bodySmall" style={styles.planItemDetail}>
                            {carrier.name}
                          </Text>
                        )}
                        {item.reference && (
                          <Text variant="bodySmall" style={styles.planItemDetail}>
                            {item.reference}
                          </Text>
                        )}
                        {item.requiresHeavyCrane && <HeavyCraneBadge />}
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={22} color={PALETTE.textMuted} />
                    </Card.Content>
                  </Card>
                );
              })}
              <Divider style={styles.divider} />
            </>
          )}

          <Text variant="bodyMedium" style={styles.label}>
            Plan de hoy para {selectedSite?.name}
          </Text>
          {pendingItemsForSite.length === 0 && (
            <Text style={styles.emptyPlan}>
              Hoy no hay carga planificada para {selectedSite?.name ?? 'este sitio'}.
            </Text>
          )}
          {pendingItemsForSite.map((item) => {
            const carrier = item.carrierId !== null ? carriersById.get(item.carrierId) : undefined;
            return (
              <Card key={item.id} style={styles.planItemCard} onPress={() => openPlanItem(item)}>
                <Card.Content style={styles.planItemContent}>
                  <View style={styles.planItemTime}>
                    <Text variant={item.hasNoSchedule ? 'bodySmall' : 'titleMedium'}>
                      {item.hasNoSchedule ? 'Sin horario' : format(new Date(item.scheduledAt), 'HH:mm')}
                    </Text>
                  </View>
                  <View style={styles.planItemText}>
                    <Text variant="bodyMedium">{OPERATION_TYPE_LABELS[item.operationType]}</Text>
                    {carrier && (
                      <Text variant="bodySmall" style={styles.planItemDetail}>
                        {carrier.name}
                      </Text>
                    )}
                    {item.reference && (
                      <Text variant="bodySmall" style={styles.planItemDetail}>
                        {item.reference}
                      </Text>
                    )}
                    {item.requiresHeavyCrane && <HeavyCraneBadge />}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={PALETTE.textMuted} />
                </Card.Content>
              </Card>
            );
          })}

          <Divider style={styles.divider} />
          <List.Item
            title={getUnplannedLabel(currentOperatorScope)}
            description="Llegó algo que no estaba en el plan"
            left={(props) => <List.Icon {...props} icon="plus-circle-outline" />}
            onPress={openUnplanned}
            style={styles.listItem}
          />
        </>
      )}

      <Portal>
        <Dialog visible={active !== null} onDismiss={closeDialog}>
          {active !== null && active !== 'unplanned' && dialogStep === 'choose' && (
            <>
              <Dialog.Title>¿Se cumplió el horario planificado?</Dialog.Title>
              <Dialog.Content>
                <Text>
                  Planificado: {format(new Date(active.scheduledAt), 'EEE dd-MM HH:mm', { locale: es })}
                </Text>
                {active.requiresHeavyCrane && (
                  <View style={styles.craneWarning}>
                    <HeavyCraneBadge />
                  </View>
                )}
              </Dialog.Content>
              <Dialog.Actions style={styles.dialogActions}>
                <Button compact onPress={closeDialog}>
                  Cancelar
                </Button>
                {currentOperatorScope === 'plan_transporte' && (
                  <Button
                    compact
                    textColor={DISPLAY_STATUS_COLORS.overdue}
                    onPress={cancelTrip}
                    loading={submitting}
                    disabled={submitting}
                  >
                    Viaje cancelado
                  </Button>
                )}
                <Button compact onPress={() => setDialogStep('time')}>
                  Otro horario
                </Button>
                <Button
                  compact
                  mode="contained"
                  onPress={confirmOnSchedule}
                  loading={submitting}
                  disabled={submitting}
                >
                  Sí, cumplió
                </Button>
              </Dialog.Actions>
            </>
          )}

          {active !== null && dialogStep === 'time' && (
            <>
              <Dialog.Title>Hora de llegada</Dialog.Title>
              <Dialog.Content>
                <Text style={styles.dialogDayLabel}>
                  Día:{' '}
                  {format(
                    new Date(active === 'unplanned' ? startOfToday() : startOfDay(active.scheduledAt)),
                    'dd-MM-yyyy',
                  )}
                </Text>
                {active !== 'unplanned' && active.hasNoSchedule && (
                  <Text style={styles.dialogDayLabel}>
                    Este viaje no tiene horario planificado — solo registra la hora de llegada.
                  </Text>
                )}
                <Menu
                  visible={blockMenuVisible}
                  onDismiss={() => setBlockMenuVisible(false)}
                  anchor={
                    <Pressable onPress={() => setBlockMenuVisible(true)}>
                      <TextInput
                        label="Hora"
                        value={selectedBlock?.label ?? ''}
                        editable={false}
                        mode="outlined"
                        right={<TextInput.Icon icon="menu-down" />}
                        pointerEvents="none"
                        style={active === 'unplanned' ? styles.field : undefined}
                      />
                    </Pressable>
                  }
                >
                  <ScrollView style={styles.blockMenuScroll}>
                    {TIME_BLOCKS.map((block) => (
                      <Menu.Item
                        key={block.minutes}
                        title={block.label}
                        onPress={() => {
                          setBlockMinutes(block.minutes);
                          setBlockMenuVisible(false);
                        }}
                      />
                    ))}
                  </ScrollView>
                </Menu>

                {active === 'unplanned' && (
                  <View>
                    <Menu
                      visible={unplannedCarrierMenuVisible}
                      onDismiss={() => setUnplannedCarrierMenuVisible(false)}
                      anchor={
                        <Pressable onPress={() => setUnplannedCarrierMenuVisible(true)}>
                          <TextInput
                            label="Empresa"
                            value={selectedUnplannedCarrier?.name ?? ''}
                            editable={false}
                            mode="outlined"
                            right={<TextInput.Icon icon="menu-down" />}
                            pointerEvents="none"
                          />
                        </Pressable>
                      }
                    >
                      {carriers.length === 0 && <Menu.Item title="No hay empresas registradas" disabled />}
                      {carriers.map((carrier) => (
                        <Menu.Item
                          key={carrier.id}
                          title={carrier.name}
                          onPress={() => {
                            setUnplannedCarrierId(carrier.id);
                            setUnplannedCarrierError(false);
                            setUnplannedCarrierMenuVisible(false);
                          }}
                        />
                      ))}
                    </Menu>
                    {unplannedCarrierError && (
                      <HelperText type="error">Selecciona la empresa</HelperText>
                    )}
                  </View>
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={closeDialog}>Cancelar</Button>
                <Button mode="contained" onPress={confirmOtherTime} loading={submitting} disabled={submitting}>
                  Confirmar
                </Button>
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
    gap: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 4,
  },
  siteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PALETTE.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  siteBannerLabel: {
    opacity: 0.6,
    marginBottom: 2,
  },
  listItem: {
    paddingHorizontal: 0,
  },
  planItemCard: {
    marginBottom: 8,
  },
  planItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planItemTime: {
    width: 60,
  },
  planItemTimeWide: {
    width: 76,
  },
  overdueLabel: {
    color: DISPLAY_STATUS_COLORS.overdue,
  },
  overdueCard: {
    borderLeftWidth: 3,
    borderLeftColor: DISPLAY_STATUS_COLORS.overdue,
  },
  planItemText: {
    flex: 1,
    gap: 2,
  },
  planItemDetail: {
    opacity: 0.7,
  },
  emptyPlan: {
    opacity: 0.7,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  dialogDayLabel: {
    marginBottom: 12,
  },
  craneWarning: {
    marginTop: 8,
  },
  blockMenuScroll: {
    maxHeight: 320,
  },
  dialogActions: {
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    rowGap: 4,
  },
});
