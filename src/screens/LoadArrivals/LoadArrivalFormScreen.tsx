import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Divider, List, Menu, Portal, Text, TextInput } from 'react-native-paper';

import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { useSessionStore } from '@/store/sessionStore';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import {
  blockMinutesOf,
  combineDayAndBlock,
  startOfDay,
  startOfToday,
  startOfWeek,
  TIME_BLOCKS,
} from '@/utils/timeBlocks';
import { OPERATION_TYPE_LABELS } from '@/utils/transportPlanDisplay';

import type { LoadArrivalsStackParamList } from './LoadArrivalsStack';

type Navigation = NativeStackNavigationProp<LoadArrivalsStackParamList, 'LoadArrivalForm'>;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ActiveSelection = TransportPlanItem | 'unplanned';

function describePlanItem(item: TransportPlanItem): string {
  const parts = [
    format(new Date(item.scheduledAt), "EEE dd-MM HH:mm", { locale: es }),
    OPERATION_TYPE_LABELS[item.operationType],
  ];
  if (item.carrier) {
    parts.push(item.carrier);
  }
  if (item.reference) {
    parts.push(item.reference);
  }
  return parts.join(' · ');
}

export function LoadArrivalFormScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);

  const [sites, setSites] = useState<Site[] | null>(null);
  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [arrivals, setArrivals] = useState<LoadArrival[] | null>(null);
  const [siteId, setSiteId] = useState(0);
  const [siteMenuVisible, setSiteMenuVisible] = useState(false);

  const [active, setActive] = useState<ActiveSelection | null>(null);
  const [dialogStep, setDialogStep] = useState<'choose' | 'time'>('choose');
  const [blockMinutes, setBlockMinutes] = useState(0);
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      siteRepository.findAll(),
      transportPlanRepository.findAll(),
      loadArrivalRepository.findAll(),
    ]).then(([loadedSites, loadedPlanItems, loadedArrivals]) => {
      setSites(loadedSites);
      setPlanItems(loadedPlanItems);
      setArrivals(loadedArrivals);
    });
  }, []);

  const weekStart = useMemo(() => startOfWeek(), []);
  const weekEnd = weekStart + WEEK_MS;

  const registeredPlanItemIds = useMemo(
    () =>
      new Set((arrivals ?? []).map((arrival) => arrival.planItemId).filter((id): id is number => id !== null)),
    [arrivals],
  );

  const pendingItemsForSite = useMemo(() => {
    if (!planItems || siteId === 0) {
      return [];
    }
    return planItems
      .filter(
        (item) =>
          item.siteId === siteId &&
          item.scheduledAt >= weekStart &&
          item.scheduledAt < weekEnd &&
          !registeredPlanItemIds.has(item.id),
      )
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [planItems, siteId, weekStart, weekEnd, registeredPlanItemIds]);

  const onSelectSite = (id: number) => {
    setSiteId(id);
    setSiteMenuVisible(false);
  };

  const openPlanItem = (item: TransportPlanItem) => {
    setActive(item);
    setDialogStep('choose');
    setBlockMinutes(blockMinutesOf(item.scheduledAt));
  };

  const openUnplanned = () => {
    setActive('unplanned');
    setDialogStep('time');
    setBlockMinutes(blockMinutesOf(Date.now()));
  };

  const closeDialog = () => {
    setActive(null);
    setDialogStep('choose');
  };

  const submit = async (arrivedAt: number, planItemId: number | null) => {
    if (!currentUser) {
      return;
    }
    setSubmitting(true);
    try {
      await loadArrivalRepository.create({
        siteId,
        arrivedAt,
        planItemId,
        registeredBy: currentUser.id,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmOnSchedule = () => {
    if (active === null || active === 'unplanned') {
      return;
    }
    submit(active.scheduledAt, active.id);
  };

  const confirmOtherTime = () => {
    if (active === null) {
      return;
    }
    const dayStart = active === 'unplanned' ? startOfToday() : startOfDay(active.scheduledAt);
    submit(combineDayAndBlock(dayStart, blockMinutes), active === 'unplanned' ? null : active.id);
  };

  if (sites === null || planItems === null || arrivals === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedSite = sites.find((site) => site.id === siteId);
  const selectedBlock = TIME_BLOCKS.find((block) => block.minutes === blockMinutes);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.field}>
        <Menu
          visible={siteMenuVisible}
          onDismiss={() => setSiteMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setSiteMenuVisible(true)}>
              <TextInput
                label="Área (patio / bodega)"
                value={selectedSite ? `${selectedSite.name} (${SITE_TYPE_LABELS[selectedSite.type]})` : ''}
                editable={false}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
                pointerEvents="none"
              />
            </Pressable>
          }
        >
          {sites.length === 0 && <Menu.Item title="No hay sitios registrados" disabled />}
          {sites.map((site) => (
            <Menu.Item
              key={site.id}
              title={`${site.name} (${SITE_TYPE_LABELS[site.type]})`}
              onPress={() => onSelectSite(site.id)}
            />
          ))}
        </Menu>
      </View>

      {siteId !== 0 && (
        <>
          <Text variant="bodyMedium" style={styles.label}>
            Plan de la semana para {selectedSite?.name}
          </Text>
          {pendingItemsForSite.length === 0 && (
            <Text style={styles.emptyPlan}>No hay viajes planificados pendientes en este sitio.</Text>
          )}
          {pendingItemsForSite.map((item) => (
            <List.Item
              key={item.id}
              title={OPERATION_TYPE_LABELS[item.operationType]}
              description={describePlanItem(item)}
              left={(props) => <List.Icon {...props} icon="calendar-clock-outline" />}
              onPress={() => openPlanItem(item)}
              style={styles.listItem}
            />
          ))}

          <Divider style={styles.divider} />
          <List.Item
            title="Viaje no planificado"
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
                  Planificado: {format(new Date(active.scheduledAt), "EEE dd-MM HH:mm", { locale: es })}
                </Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={closeDialog}>Cancelar</Button>
                <Button onPress={() => setDialogStep('time')}>Otro horario</Button>
                <Button mode="contained" onPress={confirmOnSchedule} loading={submitting} disabled={submitting}>
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
  listItem: {
    paddingHorizontal: 0,
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
  blockMenuScroll: {
    maxHeight: 320,
  },
});
