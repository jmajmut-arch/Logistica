import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';

import type { AppTabsParamList } from '@/app/navigation/AppTabs';
import { alertRepository } from '@/data/repositories/alertRepository';
import type { Alert } from '@/domain/entities/Alert';
import {
  ALERT_TYPE_LABELS,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
} from '@/utils/alertDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';
import type { AlertType } from '@/types/enums';

type Navigation = BottomTabNavigationProp<AppTabsParamList, 'Dashboard'>;

const ALERT_TYPES: AlertType[] = [
  'expiration',
  'limit_exceeded',
  'incompatibility',
  'verification_overdue',
];

export function DashboardScreen() {
  const navigation = useNavigation<Navigation>();
  const [pendingAlerts, setPendingAlerts] = useState<Alert[] | null>(null);

  const loadData = useCallback(async () => {
    setPendingAlerts(await alertRepository.findByStatus('pending'));
  }, []);

  useFocusRefresh(loadData);

  const severityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of pendingAlerts ?? []) {
      counts.set(alert.severity, (counts.get(alert.severity) ?? 0) + 1);
    }
    return counts;
  }, [pendingAlerts]);

  const typeCounts = useMemo(() => {
    const counts = new Map<AlertType, number>();
    for (const alert of pendingAlerts ?? []) {
      counts.set(alert.type, (counts.get(alert.type) ?? 0) + 1);
    }
    return counts;
  }, [pendingAlerts]);

  if (pendingAlerts === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Alertas pendientes por severidad
      </Text>
      <View style={styles.grid}>
        {SEVERITY_ORDER.map((severity) => (
          <Card key={severity} style={styles.tile} onPress={() => navigation.navigate('Alerts')}>
            <Card.Content>
              <Text variant="displaySmall" style={{ color: SEVERITY_COLORS[severity] }}>
                {severityCounts.get(severity) ?? 0}
              </Text>
              <Text variant="labelMedium">{SEVERITY_LABELS[severity]}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Por tipo
      </Text>
      <View style={styles.grid}>
        {ALERT_TYPES.map((type) => (
          <Card key={type} style={styles.tile} onPress={() => navigation.navigate('Alerts')}>
            <Card.Content>
              <Text variant="displaySmall">{typeCounts.get(type) ?? 0}</Text>
              <Text variant="labelMedium">{ALERT_TYPE_LABELS[type]}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      {pendingAlerts.length === 0 && (
        <Text style={styles.emptyMessage}>No hay alertas activas. Todo en orden.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  tile: {
    minWidth: 140,
    flexGrow: 1,
  },
  emptyMessage: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 32,
  },
});
