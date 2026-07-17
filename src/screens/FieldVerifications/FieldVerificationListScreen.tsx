import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, List, Text } from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import { fieldVerificationRepository } from '@/data/repositories/fieldVerificationRepository';
import { userRepository } from '@/data/repositories/userRepository';
import { zoneRepository } from '@/data/repositories/zoneRepository';
import type { FieldVerification, FieldVerificationItem } from '@/domain/entities/FieldVerification';
import type { User } from '@/domain/entities/User';
import type { Zone } from '@/domain/entities/Zone';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { FieldVerificationsStackParamList } from './FieldVerificationsStack';

type Navigation = NativeStackNavigationProp<
  FieldVerificationsStackParamList,
  'FieldVerificationList'
>;

export function FieldVerificationListScreen() {
  const navigation = useNavigation<Navigation>();
  const [verifications, setVerifications] = useState<FieldVerification[] | null>(null);
  const [itemsByVerification, setItemsByVerification] = useState<
    Map<number, FieldVerificationItem[]>
  >(new Map());
  const [zonesById, setZonesById] = useState<Map<number, Zone>>(new Map());
  const [usersById, setUsersById] = useState<Map<number, User>>(new Map());

  const loadData = useCallback(async () => {
    const [loadedVerifications, allItems, zones, users] = await Promise.all([
      fieldVerificationRepository.findAll(),
      fieldVerificationRepository.findAllItems(),
      zoneRepository.findAll(),
      userRepository.findAll(),
    ]);
    setVerifications(loadedVerifications);
    const grouped = new Map<number, FieldVerificationItem[]>();
    for (const item of allItems) {
      const items = grouped.get(item.verificationId) ?? [];
      items.push(item);
      grouped.set(item.verificationId, items);
    }
    setItemsByVerification(grouped);
    setZonesById(new Map(zones.map((zone) => [zone.id, zone])));
    setUsersById(new Map(users.map((user) => [user.id, user])));
  }, []);

  useFocusRefresh(loadData);

  const describe = useMemo(
    () => (verification: FieldVerification) => {
      const inspector = usersById.get(verification.performedBy);
      const parts = [format(new Date(verification.performedAt), 'dd-MM-yyyy HH:mm')];
      if (inspector) {
        parts.push(inspector.name);
      }
      return parts.join(' · ');
    },
    [usersById],
  );

  const isConforme = (verification: FieldVerification): boolean => {
    const items = itemsByVerification.get(verification.id) ?? [];
    return !items.some((item) => item.result === 'no_cumple');
  };

  if (verifications === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={verifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={verifications.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay verificaciones en terreno registradas.</Text>
        }
        renderItem={({ item }) => {
          const zone = zonesById.get(item.zoneId);
          return (
            <List.Item
              title={zone ? `${zone.name} (${zone.code})` : `Zona #${item.zoneId}`}
              description={describe(item)}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={isConforme(item) ? 'check-circle-outline' : 'alert-circle-outline'}
                  color={isConforme(item) ? '#2E7D32' : '#B3261E'}
                />
              )}
              onPress={() =>
                navigation.navigate('FieldVerificationDetail', { verificationId: item.id })
              }
            />
          );
        }}
      />
      <RoleGate permission="performVerifications">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('FieldVerificationForm')}
        />
      </RoleGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    opacity: 0.7,
    padding: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
