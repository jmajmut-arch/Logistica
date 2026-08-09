import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Menu, SegmentedButtons, Text, TextInput } from 'react-native-paper';

import { siteRepository } from '@/data/repositories/siteRepository';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import type { Site } from '@/domain/entities/Site';
import { useSessionStore } from '@/store/sessionStore';
import type { OperationType } from '@/types/enums';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';

import type { TransportPlanStackParamList } from './TransportPlanStack';

type Navigation = NativeStackNavigationProp<TransportPlanStackParamList, 'TransportPlanForm'>;

const OPERATION_TYPE_OPTIONS: { value: OperationType; label: string }[] = [
  { value: 'carga_subida', label: 'Subida' },
  { value: 'retiro_carga', label: 'Retiro' },
  { value: 'home_delivery', label: 'Home delivery' },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseScheduledAt(date: string, hour: string, minute: string): number | null {
  if (!DATE_PATTERN.test(date)) {
    return null;
  }
  const [year, month, day] = date.split('-').map(Number);
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  const parsed = new Date(year, month - 1, day, h, m, 0, 0);
  if (parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }
  return parsed.getTime();
}

export function TransportPlanFormScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);

  const [sites, setSites] = useState<Site[] | null>(null);
  const [operationType, setOperationType] = useState<OperationType>('carga_subida');
  const [siteId, setSiteId] = useState(0);
  const [siteMenuVisible, setSiteMenuVisible] = useState(false);
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [carrier, setCarrier] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [siteError, setSiteError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    siteRepository.findAll().then(setSites);
  }, []);

  const onSubmit = async () => {
    if (!currentUser) {
      return;
    }
    if (siteId === 0) {
      setSiteError(true);
      return;
    }
    setSiteError(false);

    const scheduledAt = parseScheduledAt(date.trim(), hour, minute);
    if (scheduledAt === null) {
      setDateError(true);
      return;
    }
    setDateError(false);

    setSubmitting(true);
    try {
      await transportPlanRepository.create({
        operationType,
        siteId,
        scheduledAt,
        carrier: carrier.trim() || null,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        createdBy: currentUser.id,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (sites === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedSite = sites.find((site) => site.id === siteId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="bodyMedium" style={styles.label}>
        Tipo de operación
      </Text>
      <SegmentedButtons
        value={operationType}
        onValueChange={(value) => setOperationType(value as OperationType)}
        buttons={OPERATION_TYPE_OPTIONS}
        style={styles.field}
      />

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
              onPress={() => {
                setSiteId(site.id);
                setSiteError(false);
                setSiteMenuVisible(false);
              }}
            />
          ))}
        </Menu>
        {siteError && <HelperText type="error">Selecciona un área</HelperText>}
      </View>

      <TextInput
        label="Fecha (AAAA-MM-DD)"
        value={date}
        onChangeText={setDate}
        mode="outlined"
        placeholder="2026-08-10"
        style={styles.field}
      />

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
      {dateError && (
        <HelperText type="error">Revisa la fecha (AAAA-MM-DD) y la hora ingresadas</HelperText>
      )}

      <TextInput
        label="Transportista / cliente (opcional)"
        value={carrier}
        onChangeText={setCarrier}
        mode="outlined"
        style={styles.field}
      />
      <TextInput
        label="Referencia — guía, pedido, etc. (opcional)"
        value={reference}
        onChangeText={setReference}
        mode="outlined"
        style={styles.field}
      />
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
        Guardar item del plan
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
