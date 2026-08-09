import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';

import { truckArrivalRepository } from '@/data/repositories/truckArrivalRepository';
import { useSessionStore } from '@/store/sessionStore';
import { TRUCK_LOCATION_LABELS } from '@/utils/truckArrivalDisplay';
import type { TruckLocation } from '@/types/enums';

import type { TruckArrivalsStackParamList } from './TruckArrivalsStack';

type Navigation = NativeStackNavigationProp<TruckArrivalsStackParamList, 'TruckArrivalForm'>;

const LOCATION_OPTIONS: { value: TruckLocation; label: string }[] = [
  { value: 'bodega', label: TRUCK_LOCATION_LABELS.bodega },
  { value: 'patio', label: TRUCK_LOCATION_LABELS.patio },
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseTime(hour: string, minute: string): number | null {
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.getTime();
}

export function TruckArrivalFormScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);

  const now = new Date();
  const [plate, setPlate] = useState('');
  const [carrier, setCarrier] = useState('');
  const [location, setLocation] = useState<TruckLocation>('bodega');
  const [arrivedHour, setArrivedHour] = useState(pad(now.getHours()));
  const [arrivedMinute, setArrivedMinute] = useState(pad(now.getMinutes()));
  const [hasScheduled, setHasScheduled] = useState(false);
  const [scheduledHour, setScheduledHour] = useState('');
  const [scheduledMinute, setScheduledMinute] = useState('');
  const [notes, setNotes] = useState('');
  const [plateError, setPlateError] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!currentUser) {
      return;
    }
    const trimmedPlate = plate.trim();
    if (!trimmedPlate) {
      setPlateError(true);
      return;
    }
    setPlateError(false);

    const arrivedAt = parseTime(arrivedHour, arrivedMinute);
    const scheduledAt = hasScheduled ? parseTime(scheduledHour, scheduledMinute) : null;
    if (arrivedAt === null || (hasScheduled && scheduledAt === null)) {
      setTimeError(true);
      return;
    }
    setTimeError(false);

    setSubmitting(true);
    try {
      await truckArrivalRepository.create({
        plate: trimmedPlate.toUpperCase(),
        carrier: carrier.trim() || null,
        location,
        scheduledAt,
        arrivedAt,
        registeredBy: currentUser.id,
        notes: notes.trim() || null,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        label="Patente del camión"
        value={plate}
        onChangeText={setPlate}
        mode="outlined"
        autoCapitalize="characters"
        style={styles.field}
      />
      {plateError && <HelperText type="error">Ingresa la patente</HelperText>}

      <TextInput
        label="Transportista (opcional)"
        value={carrier}
        onChangeText={setCarrier}
        mode="outlined"
        style={styles.field}
      />

      <Text variant="bodyMedium" style={styles.label}>
        Ubicación
      </Text>
      <SegmentedButtons
        value={location}
        onValueChange={(value) => setLocation(value as TruckLocation)}
        buttons={LOCATION_OPTIONS}
        style={styles.field}
      />

      <Text variant="bodyMedium" style={styles.label}>
        Hora de llegada
      </Text>
      <View style={styles.timeRow}>
        <TextInput
          label="Hora (0-23)"
          value={arrivedHour}
          onChangeText={setArrivedHour}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={2}
          style={styles.timeInput}
        />
        <TextInput
          label="Minuto (0-59)"
          value={arrivedMinute}
          onChangeText={setArrivedMinute}
          mode="outlined"
          keyboardType="number-pad"
          maxLength={2}
          style={styles.timeInput}
        />
      </View>

      <View style={styles.switchRow}>
        <Text variant="bodyMedium">¿Tenía hora planificada?</Text>
        <Switch value={hasScheduled} onValueChange={setHasScheduled} />
      </View>

      {hasScheduled && (
        <View style={styles.timeRow}>
          <TextInput
            label="Hora planificada"
            value={scheduledHour}
            onChangeText={setScheduledHour}
            mode="outlined"
            keyboardType="number-pad"
            maxLength={2}
            style={styles.timeInput}
          />
          <TextInput
            label="Minuto planificado"
            value={scheduledMinute}
            onChangeText={setScheduledMinute}
            mode="outlined"
            keyboardType="number-pad"
            maxLength={2}
            style={styles.timeInput}
          />
        </View>
      )}

      {timeError && (
        <HelperText type="error">Revisa las horas ingresadas (0-23 / 0-59)</HelperText>
      )}

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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});
