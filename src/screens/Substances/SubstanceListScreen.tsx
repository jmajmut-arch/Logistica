import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, List, Text } from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import { substanceRepository } from '@/data/repositories/substanceRepository';
import { zoneRepository } from '@/data/repositories/zoneRepository';
import type { Substance } from '@/domain/entities/Substance';
import type { Zone } from '@/domain/entities/Zone';
import { HAZARD_CLASS_LABELS } from '@/utils/hazardClassLabels';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { SubstancesStackParamList } from './SubstancesStack';

type Navigation = NativeStackNavigationProp<SubstancesStackParamList, 'SubstanceList'>;

export function SubstanceListScreen() {
  const navigation = useNavigation<Navigation>();
  const [substances, setSubstances] = useState<Substance[] | null>(null);
  const [zonesById, setZonesById] = useState<Map<number, Zone>>(new Map());

  const loadData = useCallback(async () => {
    const [loadedSubstances, zones] = await Promise.all([
      substanceRepository.findAll(),
      zoneRepository.findAll(),
    ]);
    setSubstances(loadedSubstances);
    setZonesById(new Map(zones.map((zone) => [zone.id, zone])));
  }, []);

  useFocusRefresh(loadData);

  if (substances === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={substances}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={substances.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<Text style={styles.empty}>No hay sustancias registradas.</Text>}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${HAZARD_CLASS_LABELS[item.hazardClass]} · ${item.quantity}${item.unit} · ${zonesById.get(item.zoneId)?.code ?? '—'}`}
            onPress={() => navigation.navigate('SubstanceForm', { substanceId: item.id })}
          />
        )}
      />
      <RoleGate permission="manageSubstances">
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('SubstanceForm', undefined)}
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
