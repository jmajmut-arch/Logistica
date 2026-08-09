import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Menu, RadioButton, Text, TextInput } from 'react-native-paper';

import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { LoadArrival } from '@/domain/entities/LoadArrival';
import type { Site } from '@/domain/entities/Site';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { loadArrivalService } from '@/domain/services/loadArrivalService';
import { useSessionStore } from '@/store/sessionStore';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import { blockMinutesOf, startOfToday, TIME_BLOCKS } from '@/utils/timeBlocks';
import { OPERATION_TYPE_LABELS } from '@/utils/transportPlanDisplay';

import type { LoadArrivalsStackParamList } from './LoadArrivalsStack';

type Navigation = NativeStackNavigationProp<LoadArrivalsStackParamList, 'LoadArrivalForm'>;

const UNPLANNED = 'unplanned';
const DAY_MS = 24 * 60 * 60 * 1000;

function describePlanItem(item: TransportPlanItem): string {
  const parts = [format(new Date(item.scheduledAt), 'HH:mm'), OPERATION_TYPE_LABELS[item.operationType]];
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
  const [selection, setSelection] = useState('');
  const [blockMinutes, setBlockMinutes] = useState(() => blockMinutesOf(Date.now()));
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [siteError, setSiteError] = useState(false);
  const [selectionError, setSelectionError] = useState(false);
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

  const dayStart = useMemo(() => startOfToday(), []);
  const dayEnd = dayStart + DAY_MS;

  const registeredPlanItemIds = useMemo(
    () => new Set((arrivals ?? []).map((arrival) => arrival.planItemId).filter((id): id is number => id !== null)),
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
          item.scheduledAt >= dayStart &&
          item.scheduledAt < dayEnd &&
          !registeredPlanItemIds.has(item.id),
      )
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }, [planItems, siteId, dayStart, dayEnd, registeredPlanItemIds]);

  const onSelectSite = (id: number) => {
    setSiteId(id);
    setSiteError(false);
    setSiteMenuVisible(false);
    setSelection('');
  };

  const onSelectionChange = (value: string) => {
    setSelection(value);
    setSelectionError(false);
    if (value === UNPLANNED) {
      setBlockMinutes(blockMinutesOf(Date.now()));
      return;
    }
    const item = pendingItemsForSite.find((candidate) => String(candidate.id) === value);
    if (item) {
      setBlockMinutes(blockMinutesOf(item.scheduledAt));
    }
  };

  const onSubmit = async () => {
    if (!currentUser) {
      return;
    }
    if (siteId === 0) {
      setSiteError(true);
      return;
    }
    setSiteError(false);

    if (!selection) {
      setSelectionError(true);
      return;
    }
    setSelectionError(false);

    setSubmitting(true);
    try {
      await loadArrivalService.register({
        siteId,
        blockMinutes,
        planItemId: selection === UNPLANNED ? null : Number(selection),
        registeredBy: currentUser.id,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
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
        {siteError && <HelperText type="error">Selecciona un área</HelperText>}
      </View>

      <TextInput
        label="Día"
        value={format(new Date(), 'dd-MM-yyyy')}
        editable={false}
        mode="outlined"
        style={styles.field}
      />

      {siteId !== 0 && (
        <>
          <Text variant="bodyMedium" style={styles.label}>
            Plan de hoy para {selectedSite?.name}
          </Text>
          <RadioButton.Group value={selection} onValueChange={onSelectionChange}>
            {pendingItemsForSite.length === 0 && (
              <Text style={styles.emptyPlan}>No hay viajes planificados pendientes en este sitio hoy.</Text>
            )}
            {pendingItemsForSite.map((item) => (
              <RadioButton.Item
                key={item.id}
                label={describePlanItem(item)}
                value={String(item.id)}
              />
            ))}
            <Divider style={styles.divider} />
            <RadioButton.Item label="Viaje no planificado (extra)" value={UNPLANNED} />
          </RadioButton.Group>
          {selectionError && (
            <HelperText type="error">Elige un viaje o &quot;Viaje no planificado&quot;</HelperText>
          )}

          <View style={styles.field}>
            <Menu
              visible={blockMenuVisible}
              onDismiss={() => setBlockMenuVisible(false)}
              anchor={
                <Pressable onPress={() => setBlockMenuVisible(true)}>
                  <TextInput
                    label="Hora de llegada"
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
          </View>

          <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
            Registrar llegada
          </Button>
        </>
      )}
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
  emptyPlan: {
    opacity: 0.7,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 4,
  },
  blockMenuScroll: {
    maxHeight: 320,
  },
});
