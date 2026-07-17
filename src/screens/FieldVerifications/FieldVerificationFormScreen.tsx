import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  HelperText,
  Menu,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';

import { zoneRepository } from '@/data/repositories/zoneRepository';
import type { NewFieldVerificationItem } from '@/domain/entities/FieldVerification';
import type { Zone } from '@/domain/entities/Zone';
import { fieldVerificationService } from '@/domain/services/fieldVerificationService';
import {
  FIELD_VERIFICATION_ITEMS,
  type FieldVerificationItemKey,
} from '@/domain/rules/fieldVerificationChecklist';
import { useSessionStore } from '@/store/sessionStore';
import type { VerificationResult } from '@/types/enums';

import type { FieldVerificationsStackParamList } from './FieldVerificationsStack';

type Navigation = NativeStackNavigationProp<
  FieldVerificationsStackParamList,
  'FieldVerificationForm'
>;

const RESULT_OPTIONS: { value: VerificationResult; label: string }[] = [
  { value: 'cumple', label: 'Cumple' },
  { value: 'no_cumple', label: 'No cumple' },
  { value: 'no_aplica', label: 'N/A' },
];

function initialResults(): Record<FieldVerificationItemKey, VerificationResult> {
  return Object.fromEntries(
    FIELD_VERIFICATION_ITEMS.map((item) => [item.key, 'cumple' as VerificationResult]),
  ) as Record<FieldVerificationItemKey, VerificationResult>;
}

function initialObservations(): Record<FieldVerificationItemKey, string> {
  return Object.fromEntries(FIELD_VERIFICATION_ITEMS.map((item) => [item.key, ''])) as Record<
    FieldVerificationItemKey,
    string
  >;
}

export function FieldVerificationFormScreen() {
  const navigation = useNavigation<Navigation>();
  const currentUser = useSessionStore((state) => state.currentUser);

  const [zones, setZones] = useState<Zone[] | null>(null);
  const [zoneId, setZoneId] = useState(0);
  const [zoneMenuVisible, setZoneMenuVisible] = useState(false);
  const [results, setResults] = useState(initialResults);
  const [observations, setObservations] = useState(initialObservations);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [zoneError, setZoneError] = useState(false);

  useEffect(() => {
    zoneRepository.findAll().then(setZones);
  }, []);

  const onSubmit = async () => {
    if (!currentUser) {
      return;
    }
    if (zoneId === 0) {
      setZoneError(true);
      return;
    }
    setZoneError(false);
    setSubmitting(true);
    try {
      const items: NewFieldVerificationItem[] = FIELD_VERIFICATION_ITEMS.map((item) => ({
        itemKey: item.key,
        result: results[item.key],
        observation: observations[item.key].trim() || null,
      }));
      await fieldVerificationService.create({
        zoneId,
        performedBy: currentUser.id,
        notes: notes.trim() || null,
        items,
      });
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  };

  if (zones === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const selectedZone = zones.find((zone) => zone.id === zoneId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.field}>
        <Menu
          visible={zoneMenuVisible}
          onDismiss={() => setZoneMenuVisible(false)}
          anchor={
            <Pressable onPress={() => setZoneMenuVisible(true)}>
              <TextInput
                label="Zona / rack"
                value={selectedZone ? `${selectedZone.name} (${selectedZone.code})` : ''}
                editable={false}
                mode="outlined"
                right={<TextInput.Icon icon="menu-down" />}
                pointerEvents="none"
              />
            </Pressable>
          }
        >
          {zones.map((zone) => (
            <Menu.Item
              key={zone.id}
              title={`${zone.name} (${zone.code})`}
              onPress={() => {
                setZoneId(zone.id);
                setZoneError(false);
                setZoneMenuVisible(false);
              }}
            />
          ))}
        </Menu>
        {zoneError && <HelperText type="error">Selecciona una zona</HelperText>}
      </View>

      <Divider style={styles.divider} />

      {FIELD_VERIFICATION_ITEMS.map((item) => (
        <View key={item.key} style={styles.checklistItem}>
          <Text variant="bodyMedium" style={styles.itemLabel}>
            {item.label}
          </Text>
          <SegmentedButtons
            value={results[item.key]}
            onValueChange={(value) =>
              setResults((prev) => ({ ...prev, [item.key]: value as VerificationResult }))
            }
            buttons={RESULT_OPTIONS}
          />
          {results[item.key] === 'no_cumple' && (
            <TextInput
              label="Observación"
              value={observations[item.key]}
              onChangeText={(text) => setObservations((prev) => ({ ...prev, [item.key]: text }))}
              mode="outlined"
              style={styles.observationInput}
            />
          )}
        </View>
      ))}

      <Divider style={styles.divider} />

      <TextInput
        label="Observaciones generales"
        value={notes}
        onChangeText={setNotes}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.field}
      />

      <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={submitting}>
        Guardar verificación
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
  divider: {
    marginVertical: 12,
  },
  checklistItem: {
    marginBottom: 16,
  },
  itemLabel: {
    marginBottom: 8,
  },
  observationInput: {
    marginTop: 8,
  },
});
