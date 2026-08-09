import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, List, Text } from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import { transportPlanRepository } from '@/data/repositories/transportPlanRepository';
import { userRepository } from '@/data/repositories/userRepository';
import type { TransportPlanItem } from '@/domain/entities/TransportPlanItem';
import type { User } from '@/domain/entities/User';
import { OPERATION_TYPE_LABELS } from '@/utils/transportPlanDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { TransportPlanStackParamList } from './TransportPlanStack';

type Navigation = NativeStackNavigationProp<TransportPlanStackParamList, 'TransportPlanList'>;

export function TransportPlanListScreen() {
  const navigation = useNavigation<Navigation>();
  const [planItems, setPlanItems] = useState<TransportPlanItem[] | null>(null);
  const [usersById, setUsersById] = useState<Map<number, User>>(new Map());

  const loadData = useCallback(async () => {
    const [items, users] = await Promise.all([
      transportPlanRepository.findAll(),
      userRepository.findAll(),
    ]);
    setPlanItems(items);
    setUsersById(new Map(users.map((user) => [user.id, user])));
  }, []);

  useFocusRefresh(loadData);

  const describe = useMemo(
    () => (item: TransportPlanItem) => {
      const parts = [format(new Date(item.scheduledAt), 'dd-MM-yyyy HH:mm')];
      if (item.origin) {
        parts.push(`Desde ${item.origin}`);
      }
      if (item.destination) {
        parts.push(`Hacia ${item.destination}`);
      }
      if (item.carrier) {
        parts.push(item.carrier);
      }
      const creator = usersById.get(item.createdBy);
      parts.push(
        `Ingresado por ${creator ? creator.name : `#${item.createdBy}`} el ${format(
          new Date(item.createdAt),
          'dd-MM-yyyy HH:mm',
        )}`,
      );
      return parts.join(' · ');
    },
    [usersById],
  );

  if (planItems === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={planItems}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={planItems.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay items en el plan de transporte todavía.</Text>
        }
        renderItem={({ item }) => (
          <List.Item
            title={OPERATION_TYPE_LABELS[item.operationType]}
            description={describe(item)}
            descriptionNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon="calendar-clock-outline" />}
          />
        )}
      />
      <RoleGate permission="managePlan">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('TransportPlanForm')}
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
