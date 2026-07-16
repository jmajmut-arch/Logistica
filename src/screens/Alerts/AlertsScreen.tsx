import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Chip, List, RadioButton, Text } from 'react-native-paper';

import { RoleGate } from '@/components/RoleGate';
import { SeverityBadge } from '@/components/SeverityBadge';
import { alertRepository } from '@/data/repositories/alertRepository';
import { substanceRepository } from '@/data/repositories/substanceRepository';
import { zoneRepository } from '@/data/repositories/zoneRepository';
import type { Alert } from '@/domain/entities/Alert';
import type { Substance } from '@/domain/entities/Substance';
import type { Zone } from '@/domain/entities/Zone';
import { useSessionStore } from '@/store/sessionStore';
import { ALERT_TYPE_LABELS, SEVERITY_ORDER } from '@/utils/alertDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';
import type { AlertStatus } from '@/types/enums';

const STATUS_FILTERS: { value: AlertStatus; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'resolved', label: 'Resueltas' },
];

export function AlertsScreen() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [substancesById, setSubstancesById] = useState<Map<number, Substance>>(new Map());
  const [zonesById, setZonesById] = useState<Map<number, Zone>>(new Map());
  const [statusFilter, setStatusFilter] = useState<AlertStatus>('pending');
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [loadedAlerts, substances, zones] = await Promise.all([
      alertRepository.findAll(),
      substanceRepository.findAll(),
      zoneRepository.findAll(),
    ]);
    setAlerts(loadedAlerts);
    setSubstancesById(new Map(substances.map((substance) => [substance.id, substance])));
    setZonesById(new Map(zones.map((zone) => [zone.id, zone])));
  }, []);

  useFocusRefresh(loadData);

  const visibleAlerts = useMemo(() => {
    if (!alerts) {
      return [];
    }
    return alerts
      .filter((alert) => alert.status === statusFilter)
      .filter((alert) => !severityFilter || alert.severity === severityFilter)
      .sort((a, b) => {
        if (statusFilter === 'pending') {
          const severityDiff =
            SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
          if (severityDiff !== 0) {
            return severityDiff;
          }
          return b.createdAt - a.createdAt;
        }
        return (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0);
      });
  }, [alerts, statusFilter, severityFilter]);

  const resolveAlert = async (alertId: number) => {
    if (!currentUser) {
      return;
    }
    await alertRepository.resolve(alertId, currentUser.id);
    await loadData();
  };

  const describeRelated = (alert: Alert): string => {
    const parts: string[] = [ALERT_TYPE_LABELS[alert.type]];
    const substance = alert.relatedSubstanceId
      ? substancesById.get(alert.relatedSubstanceId)
      : undefined;
    const zone = alert.relatedZoneId ? zonesById.get(alert.relatedZoneId) : undefined;
    if (substance) {
      parts.push(substance.name);
    }
    if (zone) {
      parts.push(`${zone.name} (${zone.code})`);
    }
    return parts.join(' · ');
  };

  if (alerts === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <RadioButton.Group
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as AlertStatus)}
        >
          <View style={styles.statusRow}>
            {STATUS_FILTERS.map((filter) => (
              <View key={filter.value} style={styles.statusOption}>
                <RadioButton value={filter.value} />
                <Text onPress={() => setStatusFilter(filter.value)}>{filter.label}</Text>
              </View>
            ))}
          </View>
        </RadioButton.Group>
        <View style={styles.severityRow}>
          <Chip selected={severityFilter === null} onPress={() => setSeverityFilter(null)}>
            Todas
          </Chip>
          {SEVERITY_ORDER.map((severity) => (
            <Chip
              key={severity}
              selected={severityFilter === severity}
              onPress={() => setSeverityFilter(severity)}
            >
              {severity}
            </Chip>
          ))}
        </View>
      </View>

      <FlatList
        data={visibleAlerts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={visibleAlerts.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<Text style={styles.empty}>No hay alertas en este filtro.</Text>}
        renderItem={({ item }) => (
          <List.Item
            title={item.message}
            description={describeRelated(item)}
            left={() => <SeverityBadge severity={item.severity} />}
            right={() =>
              item.status === 'pending' ? (
                <RoleGate permission="resolveAlerts">
                  <Button compact onPress={() => resolveAlert(item.id)}>
                    Resolver
                  </Button>
                </RoleGate>
              ) : null
            }
          />
        )}
      />
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
  filters: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
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
});
