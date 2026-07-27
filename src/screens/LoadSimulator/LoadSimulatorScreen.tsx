import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  IconButton,
  List,
  Menu,
  Portal,
  ProgressBar,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';

import type { CargoItem, LoadCapacityCategory } from '@/domain/entities/LoadSimulation';
import { simulateLoad } from '@/domain/rules/loadSimulatorRules';
import { CUSTOM_PROFILE_ID, profilesForCategory } from '@/screens/LoadSimulator/loadProfiles';
import { PALETTE } from '@/theme';

interface ItemDraft {
  name: string;
  unitWeightKg: string;
  unitVolumeM3: string;
  quantity: string;
}

const EMPTY_DRAFT: ItemDraft = { name: '', unitWeightKg: '', unitVolumeM3: '', quantity: '1' };

function toNumber(text: string): number {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function formatNumber(value: number): string {
  return value.toLocaleString('es-CL', { maximumFractionDigits: 2 });
}

export function LoadSimulatorScreen() {
  const [category, setCategory] = useState<LoadCapacityCategory>('vehicle');
  const [profileId, setProfileId] = useState(profilesForCategory('vehicle')[0].id);
  const [maxWeightKg, setMaxWeightKg] = useState(
    String(profilesForCategory('vehicle')[0].maxWeightKg),
  );
  const [maxVolumeM3, setMaxVolumeM3] = useState(
    String(profilesForCategory('vehicle')[0].maxVolumeM3),
  );
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [items, setItems] = useState<CargoItem[]>([]);
  const [draft, setDraft] = useState<ItemDraft | null>(null);

  const profiles = profilesForCategory(category);

  const selectCategory = (next: string) => {
    const nextCategory = next as LoadCapacityCategory;
    const nextProfiles = profilesForCategory(nextCategory);
    setCategory(nextCategory);
    setProfileId(nextProfiles[0].id);
    setMaxWeightKg(String(nextProfiles[0].maxWeightKg));
    setMaxVolumeM3(String(nextProfiles[0].maxVolumeM3));
  };

  const selectProfile = (id: string) => {
    setProfileId(id);
    setProfileMenuVisible(false);
    if (id === CUSTOM_PROFILE_ID) {
      return;
    }
    const profile = profiles.find((candidate) => candidate.id === id);
    if (profile) {
      setMaxWeightKg(String(profile.maxWeightKg));
      setMaxVolumeM3(String(profile.maxVolumeM3));
    }
  };

  const profileLabel =
    profileId === CUSTOM_PROFILE_ID
      ? 'Personalizado'
      : (profiles.find((candidate) => candidate.id === profileId)?.label ?? 'Personalizado');

  const result = useMemo(
    () =>
      simulateLoad(items, {
        maxWeightKg: toNumber(maxWeightKg),
        maxVolumeM3: toNumber(maxVolumeM3),
      }),
    [items, maxWeightKg, maxVolumeM3],
  );

  const openAddItem = () => setDraft({ ...EMPTY_DRAFT });
  const closeDialog = () => setDraft(null);

  const saveItem = () => {
    if (!draft || draft.name.trim() === '') {
      return;
    }
    const quantity = toNumber(draft.quantity);
    if (quantity <= 0) {
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        name: draft.name.trim(),
        unitWeightKg: toNumber(draft.unitWeightKg),
        unitVolumeM3: toNumber(draft.unitVolumeM3),
        quantity,
      },
    ]);
    closeDialog();
  };

  const removeItem = (id: string) =>
    setItems((current) => current.filter((item) => item.id !== id));

  const weightColor = result.overWeight
    ? '#B3261E'
    : result.weightNearLimit
      ? PALETTE.primary
      : undefined;
  const volumeColor = result.overVolume
    ? '#B3261E'
    : result.volumeNearLimit
      ? PALETTE.primary
      : undefined;

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="titleMedium">Capacidad</Text>
        <SegmentedButtons
          value={category}
          onValueChange={selectCategory}
          style={styles.segmented}
          buttons={[
            { value: 'vehicle', label: 'Transporte', icon: 'truck-outline' },
            { value: 'zone', label: 'Bodega', icon: 'warehouse' },
          ]}
        />

        <Menu
          visible={profileMenuVisible}
          onDismiss={() => setProfileMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setProfileMenuVisible(true)}>
              <TextInput
                label={category === 'vehicle' ? 'Perfil de vehículo' : 'Perfil de bodega'}
                value={profileLabel}
                editable={false}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
                pointerEvents="none"
              />
            </Pressable>
          }
        >
          {profiles.map((profile) => (
            <Menu.Item
              key={profile.id}
              title={profile.label}
              onPress={() => selectProfile(profile.id)}
            />
          ))}
          <Menu.Item title="Personalizado" onPress={() => selectProfile(CUSTOM_PROFILE_ID)} />
        </Menu>

        <View style={styles.capacityRow}>
          <TextInput
            label="Peso máx. (kg)"
            value={maxWeightKg}
            onChangeText={(text) => {
              setMaxWeightKg(text.replace(',', '.'));
              setProfileId(CUSTOM_PROFILE_ID);
            }}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.capacityField}
          />
          <TextInput
            label="Volumen máx. (m³)"
            value={maxVolumeM3}
            onChangeText={(text) => {
              setMaxVolumeM3(text.replace(',', '.'));
              setProfileId(CUSTOM_PROFILE_ID);
            }}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.capacityField}
          />
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Ítems de carga
        </Text>
        {items.length === 0 && <Text style={styles.emptyText}>Sin ítems agregados.</Text>}
        {items.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            description={`${formatNumber(item.unitWeightKg)} kg · ${formatNumber(item.unitVolumeM3)} m³ × ${item.quantity}`}
            right={() => <IconButton icon="delete-outline" onPress={() => removeItem(item.id)} />}
            style={styles.itemRow}
          />
        ))}
        <Button compact icon="plus" onPress={openAddItem} style={styles.addButton}>
          Agregar ítem
        </Button>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Resultado de la simulación
        </Text>
        <View style={styles.resultBlock}>
          <Text variant="bodyMedium">Peso</Text>
          <View style={styles.progressBarWrapper}>
            <ProgressBar progress={Math.min(result.weightUtilization, 1)} color={weightColor} />
          </View>
          <Text variant="bodySmall" style={result.overWeight && styles.overText}>
            {formatNumber(result.totalWeightKg)} kg / {formatNumber(result.maxWeightKg)} kg (
            {Math.round(result.weightUtilization * 100)}%)
          </Text>
        </View>
        <View style={styles.resultBlock}>
          <Text variant="bodyMedium">Volumen</Text>
          <View style={styles.progressBarWrapper}>
            <ProgressBar progress={Math.min(result.volumeUtilization, 1)} color={volumeColor} />
          </View>
          <Text variant="bodySmall" style={result.overVolume && styles.overText}>
            {formatNumber(result.totalVolumeM3)} m³ / {formatNumber(result.maxVolumeM3)} m³ (
            {Math.round(result.volumeUtilization * 100)}%)
          </Text>
        </View>
        <Text variant="bodySmall" style={styles.itemCount}>
          {result.itemCount} unidades en {items.length} ítem(s)
        </Text>
        {(result.overWeight || result.overVolume) && (
          <Text style={styles.overWarning}>
            La carga excede la capacidad{' '}
            {result.overWeight && result.overVolume
              ? 'de peso y volumen'
              : result.overWeight
                ? 'de peso'
                : 'de volumen'}
            .
          </Text>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={draft !== null} onDismiss={closeDialog}>
          <Dialog.Title>Ítem de carga</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {draft && (
              <>
                <TextInput
                  label="Nombre"
                  value={draft.name}
                  onChangeText={(text) => setDraft({ ...draft, name: text })}
                  mode="outlined"
                />
                <TextInput
                  label="Peso unitario (kg)"
                  value={draft.unitWeightKg}
                  onChangeText={(text) =>
                    setDraft({ ...draft, unitWeightKg: text.replace(',', '.') })
                  }
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.dialogField}
                />
                <TextInput
                  label="Volumen unitario (m³)"
                  value={draft.unitVolumeM3}
                  onChangeText={(text) =>
                    setDraft({ ...draft, unitVolumeM3: text.replace(',', '.') })
                  }
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.dialogField}
                />
                <TextInput
                  label="Cantidad"
                  value={draft.quantity}
                  onChangeText={(text) => setDraft({ ...draft, quantity: text.replace(',', '.') })}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.dialogField}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancelar</Button>
            <Button onPress={saveItem}>Agregar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 4,
  },
  segmented: {
    marginTop: 8,
    marginBottom: 12,
  },
  capacityRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  capacityField: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 4,
  },
  emptyText: {
    opacity: 0.6,
    marginBottom: 8,
  },
  itemRow: {
    paddingHorizontal: 0,
  },
  addButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  resultBlock: {
    marginTop: 8,
  },
  progressBarWrapper: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  overText: {
    color: '#B3261E',
  },
  overWarning: {
    color: '#B3261E',
    marginTop: 12,
    fontWeight: '600',
  },
  itemCount: {
    marginTop: 8,
    opacity: 0.7,
  },
  dialogContent: {
    gap: 4,
  },
  dialogField: {
    marginTop: 8,
  },
});
