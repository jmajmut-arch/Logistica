import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  IconButton,
  List,
  Menu,
  Portal,
  ProgressBar,
  Text,
  TextInput,
} from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import {
  substanceRepository,
  type ZoneClassQuantity,
} from '@/data/repositories/substanceRepository';
import { zoneRepository } from '@/data/repositories/zoneRepository';
import { recalculateAlerts } from '@/domain/services/alertService';
import type { Zone, ZoneClassLimit } from '@/domain/entities/Zone';
import { HAZARD_CLASSES } from '@/types/enums';
import { HAZARD_CLASS_LABELS } from '@/utils/hazardClassLabels';
import { useFocusRefresh } from '@/utils/useFocusRefresh';
import type { HazardClass } from '@/types/enums';

interface EditingContext {
  zoneId: number;
  hazardClass: HazardClass;
  maxQuantity: string;
  unit: string;
}

export function StorageLimitsScreen() {
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [limits, setLimits] = useState<ZoneClassLimit[]>([]);
  const [totals, setTotals] = useState<ZoneClassQuantity[]>([]);
  const [editing, setEditing] = useState<EditingContext | null>(null);
  const [classMenuVisible, setClassMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [loadedZones, loadedLimits, loadedTotals] = await Promise.all([
      zoneRepository.findAll(),
      zoneRepository.findAllClassLimits(),
      substanceRepository.sumQuantityByZoneAndClass(),
    ]);
    setZones(loadedZones);
    setLimits(loadedLimits);
    setTotals(loadedTotals);
  }, []);

  useFocusRefresh(loadData);

  const limitsByZone = useMemo(() => {
    const map = new Map<number, ZoneClassLimit[]>();
    for (const limit of limits) {
      const zoneLimits = map.get(limit.zoneId) ?? [];
      zoneLimits.push(limit);
      map.set(limit.zoneId, zoneLimits);
    }
    return map;
  }, [limits]);

  const totalFor = (zoneId: number, hazardClass: HazardClass): number =>
    totals.find((total) => total.zoneId === zoneId && total.hazardClass === hazardClass)
      ?.totalQuantity ?? 0;

  const openAdd = (zoneId: number) =>
    setEditing({ zoneId, hazardClass: HAZARD_CLASSES[0], maxQuantity: '', unit: '' });

  const openEdit = (limit: ZoneClassLimit) =>
    setEditing({
      zoneId: limit.zoneId,
      hazardClass: limit.hazardClass,
      maxQuantity: String(limit.maxQuantity),
      unit: limit.unit,
    });

  const closeDialog = () => setEditing(null);

  const saveLimit = async () => {
    if (!editing) {
      return;
    }
    const maxQuantity = Number(editing.maxQuantity);
    if (!editing.unit.trim() || Number.isNaN(maxQuantity) || maxQuantity <= 0) {
      return;
    }
    setSaving(true);
    try {
      await zoneRepository.upsertClassLimit({
        zoneId: editing.zoneId,
        hazardClass: editing.hazardClass,
        maxQuantity,
        unit: editing.unit.trim(),
      });
      await recalculateAlerts();
      await loadData();
      closeDialog();
    } finally {
      setSaving(false);
    }
  };

  if (zones === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {zones.map((zone) => {
          const zoneLimits = limitsByZone.get(zone.id) ?? [];
          return (
            <View key={zone.id} style={styles.zoneSection}>
              <List.Subheader>
                {zone.name} ({zone.code})
              </List.Subheader>
              {zoneLimits.length === 0 && (
                <Text style={styles.noLimits}>Sin límites configurados.</Text>
              )}
              {zoneLimits.map((limit) => {
                const used = totalFor(limit.zoneId, limit.hazardClass);
                const progress = limit.maxQuantity > 0 ? Math.min(used / limit.maxQuantity, 1) : 0;
                const exceeded = used > limit.maxQuantity;
                return (
                  <View key={limit.id} style={styles.limitRow}>
                    <View style={styles.limitHeader}>
                      <Text variant="bodyMedium">{HAZARD_CLASS_LABELS[limit.hazardClass]}</Text>
                      <RoleGate permission="configureRules">
                        <IconButton icon="pencil" size={18} onPress={() => openEdit(limit)} />
                      </RoleGate>
                    </View>
                    <ProgressBar
                      progress={progress}
                      color={exceeded ? '#B3261E' : undefined}
                      style={styles.progressBar}
                    />
                    <Text variant="bodySmall" style={exceeded && styles.exceededText}>
                      {used}
                      {limit.unit} / {limit.maxQuantity}
                      {limit.unit}
                    </Text>
                  </View>
                );
              })}
              <RoleGate permission="configureRules">
                <Button
                  compact
                  icon="plus"
                  onPress={() => openAdd(zone.id)}
                  style={styles.addButton}
                >
                  Agregar límite
                </Button>
              </RoleGate>
            </View>
          );
        })}
      </ScrollView>

      <Portal>
        <Dialog visible={editing !== null} onDismiss={closeDialog}>
          <Dialog.Title>Límite de almacenamiento</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {editing && (
              <>
                <Menu
                  visible={classMenuVisible}
                  onDismiss={() => setClassMenuVisible(false)}
                  anchor={
                    <TextInput
                      label="Clase de peligrosidad"
                      value={HAZARD_CLASS_LABELS[editing.hazardClass]}
                      editable={false}
                      mode="outlined"
                      right={<TextInput.Icon icon="menu-down" />}
                      onPressIn={() => setClassMenuVisible(true)}
                    />
                  }
                >
                  {HAZARD_CLASSES.map((hazardClass) => (
                    <Menu.Item
                      key={hazardClass}
                      title={HAZARD_CLASS_LABELS[hazardClass]}
                      onPress={() => {
                        setEditing({ ...editing, hazardClass });
                        setClassMenuVisible(false);
                      }}
                    />
                  ))}
                </Menu>
                <TextInput
                  label="Cantidad máxima"
                  value={editing.maxQuantity}
                  onChangeText={(text) =>
                    setEditing({ ...editing, maxQuantity: text.replace(',', '.') })
                  }
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.dialogField}
                />
                <TextInput
                  label="Unidad (kg, l...)"
                  value={editing.unit}
                  onChangeText={(text) => setEditing({ ...editing, unit: text })}
                  mode="outlined"
                  style={styles.dialogField}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancelar</Button>
            <Button onPress={saveLimit} loading={saving} disabled={saving}>
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneSection: {
    marginBottom: 16,
  },
  noLimits: {
    paddingHorizontal: 16,
    opacity: 0.6,
  },
  limitRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 4,
  },
  exceededText: {
    color: '#B3261E',
  },
  addButton: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  dialogContent: {
    gap: 4,
  },
  dialogField: {
    marginTop: 8,
  },
});
