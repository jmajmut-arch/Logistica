import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, Menu, Text, TextInput } from 'react-native-paper';

import { loadArrivalRepository } from '@/data/repositories/loadArrivalRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import { useSessionStore } from '@/store/sessionStore';
import { OPERATION_TYPE_LABELS } from '@/utils/transportPlanDisplay';

import type { LoadArrivalsStackParamList } from './LoadArrivalsStack';

type Navigation = NativeStackNavigationProp<LoadArrivalsStackParamList, 'LoadArrivalForm'>;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function describePlanItem(item: TransportPlanItem): string {
  const parts = [OPERATION_TYPE_LABELS[item.operationType], format(new Date(item.scheduledAt), 'dd-MM-yyyy HH:mm')];
  if (item.destination) {
    parts.push(item.destination);
  }
  return parts.join(' · ');
}

export function LoadArrivalFormScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);

  const now = new Date();
  const [pendingItems, setPendingItems] = useState<TransportPlanItem[] | null>(null);
  const [planItemId, setPlanItemId] = useState(0);
  const [planItemMenuVisible, setPlanItemMenuVisible] = useState(false);
  const [hour, setHour] = useState(pad(now.getHours()));
  const [minute, setMinute] = useState(pad(now.getMinutes()));
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [planItemError, setPlanItemError] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([transportPlanRepository.findAll(), loadArrivalRepository.findAll()]).then(
      ([planItems, arrivals]) => {
        const registeredIds = new Set(arrivals.map((arrival) => arrival.planItemId));
        setPendingItems(planItems.filter((item) => !registeredIds.has(item.id)));
      },
    );
  }, []);

  const onSelectPlanItem = (item: TransportPlanItem) => {
    setPlanItemId(item.id);
    setPlanItemError(false);
    setPlanItemMenuVisible(false);
    if (!location.trim()) {
      setLocation(item.destination ?? item.origin ?? '');
    }
  };

  const onSubmit = async () => {
    if (!currentUser) {
      return;
    }
    if (planItemId === 0) {
      setPlanItemError(true);
      return;
    }
    setPlanItemError(false);

    const h = Number(hour);
    const m = Number(minute);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      setTimeError(true);
      return;
    }
    setTimeError(false);

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      setLocationError(true);
      return;
    }
    setLocationError(false);

    const arrivedAt = new Date();
    arrivedAt.setHours(h, m, 0, 0);

    setSubmitting(true);
    try {
      await loadArrivalRepository.create({
        planItemId,
        arrivedAt: arrivedAt.getTime(),
        location: trimmedLocation,
        registeredBy: currentUser.id,
        notes: notes.trim() || null,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingItems === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedItem = pendingItems.find((item) => item.id === planItemId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.field}>
        <Menu
          visible={planItemMenuVisible}
          onDismiss={() => setPlanItemMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setPlanItemMenuVisible(true)}>
              <TextInput
                label="Item del plan"
                value={selectedItem ? describePlanItem(selectedItem) : ''}
                editable={false}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
                pointerEvents="none"
              />
            </Pressable>
          }
        >
          {pendingItems.length === 0 && <Menu.Item title="No hay items pendientes" disabled />}
          {pendingItems.map((item) => (
            <Menu.Item key={item.id} title={describePlanItem(item)} onPress={() => onSelectPlanItem(item)} />
          ))}
        </Menu>
        {planItemError && <HelperText type="error">Selecciona un item del plan</HelperText>}
      </View>

      <Text variant="bodyMedium" style={styles.label}>
        Hora de llegada
      </Text>
      <View style={styles.timeRow}>
        <TextInput
          label="Hora (0-23)"
          value={hour}
          onChangeText={setHour}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={2}
          style={styles.timeInput}
        />
        <TextInput
          label="Minuto (0-59)"
          value={minute}
          onChangeText={setMinute}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={2}
          style={styles.timeInput}
        />
      </View>
      {timeError && <HelperText type="error">Revisa la hora ingresada (0-23 / 0-59)</HelperText>}

      <TextInput
        label="Lugar"
        value={location}
        onChangeText={setLocation}
        mode="outlined"
        style={styles.field}
      />
      {locationError && <HelperText type="error">Ingresa el lugar de llegada</HelperText>}

      <TextInput
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.field}
      />

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        Registrar llegada
      </Button>
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
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timeInput: {
    flex: 1,
  },
});
