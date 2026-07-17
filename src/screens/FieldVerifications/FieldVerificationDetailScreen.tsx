import { useRoute, type RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, List, Text } from 'react-native-paper';

import { fieldVerificationRepository } from '@/data/repositories/fieldVerificationRepository';
import { userRepository } from '@/data/repositories/userRepository';
import { zoneRepository } from '@/data/repositories/zoneRepository';
import type { FieldVerification, FieldVerificationItem } from '@/domain/entities/FieldVerification';
import { FIELD_VERIFICATION_ITEM_LABELS } from '@/domain/rules/fieldVerificationChecklist';
import type { User } from '@/domain/entities/User';
import type { Zone } from '@/domain/entities/Zone';
import { useFocusRefresh } from '@/utils/useFocusRefresh';
import type { VerificationResult } from '@/types/enums';

import type { FieldVerificationsStackParamList } from './FieldVerificationsStack';

type DetailRoute = RouteProp<FieldVerificationsStackParamList, 'FieldVerificationDetail'>;

const RESULT_LABELS: Record<VerificationResult, string> = {
  cumple: 'Cumple',
  no_cumple: 'No cumple',
  no_aplica: 'No aplica',
};

const RESULT_COLORS: Record<VerificationResult, string> = {
  cumple: '#2E7D32',
  no_cumple: '#B3261E',
  no_aplica: '#6B7280',
};

interface DetailData {
  verification: FieldVerification;
  items: FieldVerificationItem[];
  zone: Zone | undefined;
  inspector: User | undefined;
}

export function FieldVerificationDetailScreen() {
  const route = useRoute<DetailRoute>();
  const { verificationId } = route.params;
  const [data, setData] = useState<DetailData | null>(null);

  const loadData = useCallback(async () => {
    const [items, zones, users] = await Promise.all([
      fieldVerificationRepository.findItems(verificationId),
      zoneRepository.findAll(),
      userRepository.findAll(),
    ]);
    const verifications = await fieldVerificationRepository.findAll();
    const verification = verifications.find((candidate) => candidate.id === verificationId);
    if (!verification) {
      return;
    }
    setData({
      verification,
      items,
      zone: zones.find((zone) => zone.id === verification.zoneId),
      inspector: users.find((user) => user.id === verification.performedBy),
    });
  }, [verificationId]);

  useFocusRefresh(loadData);

  if (data === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { verification, items, zone, inspector } = data;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleMedium">
        {zone ? `${zone.name} (${zone.code})` : `Zona #${verification.zoneId}`}
      </Text>
      <Text variant="bodyMedium" style={styles.meta}>
        {format(new Date(verification.performedAt), 'dd-MM-yyyy HH:mm')}
        {inspector ? ` · ${inspector.name}` : ''}
      </Text>

      <Divider style={styles.divider} />

      {items.map((item) => (
        <List.Item
          key={item.id}
          title={FIELD_VERIFICATION_ITEM_LABELS[item.itemKey]}
          description={item.observation ?? undefined}
          right={() => (
            <Text style={[styles.resultLabel, { color: RESULT_COLORS[item.result] }]}>
              {RESULT_LABELS[item.result]}
            </Text>
          )}
        />
      ))}

      {verification.notes && (
        <>
          <Divider style={styles.divider} />
          <Text variant="labelLarge">Observaciones generales</Text>
          <Text variant="bodyMedium" style={styles.notes}>
            {verification.notes}
          </Text>
        </>
      )}
    </ScrollView>
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
  meta: {
    opacity: 0.7,
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  resultLabel: {
    alignSelf: 'center',
    fontWeight: '600',
  },
  notes: {
    marginTop: 4,
  },
});
