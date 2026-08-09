import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, FAB, List, Text } from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import { siteRepository } from '@/data/repositories/siteRepository';
import type { Site } from '@/domain/entities/Site';
import { SITE_TYPE_LABELS } from '@/utils/siteDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { SitesStackParamList } from './SitesStack';

type Navigation = NativeStackNavigationProp<SitesStackParamList, 'SiteList'>;

export function SiteListScreen() {
  const navigation = useNavigation<Navigation>();
  const [sites, setSites] = useState<Site[] | null>(null);

  useFocusRefresh(async () => {
    setSites(await siteRepository.findAll());
  });

  if (sites === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sites}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={sites.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<Text style={styles.empty}>No hay patios ni bodegas registrados.</Text>}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={SITE_TYPE_LABELS[item.type]}
            left={(props) => (
              <List.Icon {...props} icon={item.type === 'patio' ? 'texture-box' : 'warehouse'} />
            )}
          />
        )}
      />
      <RoleGate permission="managePlan">
        <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('SiteForm')} />
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
