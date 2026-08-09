import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, List, Text } from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import { TruckStatusBadge } from '@/components/TruckStatusBadge';
import { truckArrivalRepository } from '@/data/repositories/truckArrivalRepository';
import { userRepository } from '@/data/repositories/userRepository';
import type { TruckArrival } from '@/domain/entities/TruckArrival';
import { getTruckArrivalStatus } from '@/domain/rules/truckArrivalStatus';
import type { User } from '@/domain/entities/User';
import { TRUCK_LOCATION_LABELS } from '@/utils/truckArrivalDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { TruckArrivalsStackParamList } from './TruckArrivalsStack';

type Navigation = NativeStackNavigationProp<TruckArrivalsStackParamList, 'TruckArrivalList'>;

export function TruckArrivalListScreen() {
  const navigation = useNavigation<Navigation>();
  const [arrivals, setArrivals] = useState<TruckArrival[] | null>(null);
  const [usersById, setUsersById] = useState<Map<number, User>>(new Map());

  const loadData = useCallback(async () => {
    const [loadedArrivals, users] = await Promise.all([
      truckArrivalRepository.findAll(),
      userRepository.findAll(),
    ]);
    setArrivals(loadedArrivals);
    setUsersById(new Map(users.map((user) => [user.id, user])));
  }, []);

  useFocusRefresh(loadData);

  const describe = useMemo(
    () => (arrival: TruckArrival) => {
      const parts = [
        TRUCK_LOCATION_LABELS[arrival.location],
        `Llegó ${format(new Date(arrival.arrivedAt), 'dd-MM-yyyy HH:mm')}`,
      ];
      if (arrival.scheduledAt !== null) {
        parts.push(`Planificado ${format(new Date(arrival.scheduledAt), 'HH:mm')}`);
      }
      if (arrival.carrier) {
        parts.push(arrival.carrier);
      }
      const registeredBy = usersById.get(arrival.registeredBy);
      if (registeredBy) {
        parts.push(registeredBy.name);
      }
      return parts.join(' · ');
    },
    [usersById],
  );

  if (arrivals === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={arrivals}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={arrivals.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay llegadas de camiones registradas.</Text>
        }
        renderItem={({ item }) => (
          <List.Item
            title={item.plate}
            description={describe(item)}
            left={(props) => <List.Icon {...props} icon="truck-outline" />}
            right={() => <TruckStatusBadge status={getTruckArrivalStatus(item)} />}
          />
        )}
      />
      <RoleGate permission="registerTruckArrivals">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('TruckArrivalForm')}
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
