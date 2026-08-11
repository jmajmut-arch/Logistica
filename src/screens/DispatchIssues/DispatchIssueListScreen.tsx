import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, FAB, List, Text } from 'react-native-paper';

import { DonutChart } from '@/components/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { RoleGate } from '@/components/RoleGate';
import { dispatchIssueRepository } from '@/data/repositories/dispatchIssueRepository';
import { siteRepository } from '@/data/repositories/siteRepository';
import type { DispatchIssue } from '@/domain/entities/DispatchIssue';
import type { Site } from '@/domain/entities/Site';
import { DISPATCH_ISSUE_TYPES } from '@/types/enums';
import { DISPATCH_ISSUE_STATUS_COLORS, DISPATCH_ISSUE_TYPE_LABELS } from '@/utils/dispatchIssueDisplay';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

import type { DispatchIssuesStackParamList } from './DispatchIssuesStack';

type Navigation = NativeStackNavigationProp<DispatchIssuesStackParamList, 'DispatchIssueList'>;

const DAY_MS = 24 * 60 * 60 * 1000;

export function DispatchIssueListScreen() {
  const navigation = useNavigation<Navigation>();
  const [issues, setIssues] = useState<DispatchIssue[] | null>(null);
  const [sitesById, setSitesById] = useState<Map<number, Site>>(new Map());
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');

  const loadData = useCallback(async () => {
    const [loadedIssues, sites] = await Promise.all([
      dispatchIssueRepository.findAll(),
      siteRepository.findAll(),
    ]);
    setIssues(loadedIssues);
    setSitesById(new Map(sites.map((site) => [site.id, site])));
  }, []);

  useFocusRefresh(loadData);

  const openCount = useMemo(() => (issues ?? []).filter((issue) => issue.status === 'open').length, [issues]);
  const closedCount = (issues?.length ?? 0) - openCount;

  const countByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of issues ?? []) {
      counts.set(issue.issueType, (counts.get(issue.issueType) ?? 0) + 1);
    }
    return counts;
  }, [issues]);

  // Tiempo promedio entre levantar y cerrar, solo sobre las ya regularizadas — indica qué
  // tan rápido el supervisor está resolviendo los problemas.
  const avgCloseDays = useMemo(() => {
    const closed = (issues ?? []).filter(
      (issue): issue is DispatchIssue & { closedAt: number } =>
        issue.status === 'closed' && issue.closedAt !== null,
    );
    if (closed.length === 0) {
      return null;
    }
    const totalMs = closed.reduce((sum, issue) => sum + (issue.closedAt - issue.raisedAt), 0);
    return Math.round((totalMs / closed.length / DAY_MS) * 10) / 10;
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!issues) {
      return [];
    }
    if (statusFilter === 'all') {
      return issues;
    }
    return issues.filter((issue) => issue.status === statusFilter);
  }, [issues, statusFilter]);

  const siteName = useCallback(
    (siteId: number) => sitesById.get(siteId)?.name ?? `Sitio #${siteId}`,
    [sitesById],
  );

  if (issues === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, filteredIssues.length === 0 && styles.emptyContainer]}
        ListHeaderComponent={
          <View>
            <View style={styles.grid}>
              <Card style={styles.tile}>
                <Card.Content>
                  <Text variant="displaySmall" style={{ color: DISPATCH_ISSUE_STATUS_COLORS.open }}>
                    {openCount}
                  </Text>
                  <Text variant="labelMedium">Abiertas</Text>
                </Card.Content>
              </Card>
              <Card style={styles.tile}>
                <Card.Content>
                  <Text variant="displaySmall" style={{ color: DISPATCH_ISSUE_STATUS_COLORS.closed }}>
                    {closedCount}
                  </Text>
                  <Text variant="labelMedium">Cerradas</Text>
                </Card.Content>
              </Card>
              <Card style={styles.tile}>
                <Card.Content>
                  <Text variant="displaySmall">{issues.length}</Text>
                  <Text variant="labelMedium">Total</Text>
                </Card.Content>
              </Card>
            </View>

            {issues.length > 0 && (
              <Card style={styles.wideCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Estadísticas
                  </Text>
                  <View style={styles.donutRow}>
                    <DonutChart
                      segments={[
                        { key: 'open', value: openCount, color: DISPATCH_ISSUE_STATUS_COLORS.open },
                        { key: 'closed', value: closedCount, color: DISPATCH_ISSUE_STATUS_COLORS.closed },
                      ]}
                      centerValue={String(issues.length)}
                      centerLabel={issues.length === 1 ? 'guía' : 'guías'}
                    />
                    <View style={styles.legend}>
                      {DISPATCH_ISSUE_TYPES.map((type) => (
                        <View key={type} style={styles.legendRow}>
                          <Text variant="bodyMedium" style={styles.legendLabel}>
                            {DISPATCH_ISSUE_TYPE_LABELS[type]}
                          </Text>
                          <Text variant="bodyMedium" style={styles.legendCount}>
                            {countByType.get(type) ?? 0}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  {avgCloseDays !== null && (
                    <Text variant="bodySmall" style={styles.itemDescription}>
                      Tiempo promedio de cierre: {avgCloseDays} {avgCloseDays === 1 ? 'día' : 'días'}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            )}

            <View style={styles.filterRow}>
              <Chip selected={statusFilter === 'open'} onPress={() => setStatusFilter('open')}>
                Abiertas ({openCount})
              </Chip>
              <Chip selected={statusFilter === 'closed'} onPress={() => setStatusFilter('closed')}>
                Cerradas ({closedCount})
              </Chip>
              <Chip selected={statusFilter === 'all'} onPress={() => setStatusFilter('all')}>
                Todas ({issues.length})
              </Chip>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="file-alert-outline"
            message={
              statusFilter === 'open'
                ? 'No hay incidencias abiertas.'
                : statusFilter === 'closed'
                  ? 'No hay incidencias cerradas todavía.'
                  : 'No hay guías con problemas registradas.'
            }
          />
        }
        renderItem={({ item }) => (
          <List.Item
            title={`Guía ${item.guideNumber}`}
            description={`${siteName(item.siteId)} · ${DISPATCH_ISSUE_TYPE_LABELS[item.issueType]} · ${format(
              new Date(item.raisedAt),
              'dd-MM-yyyy HH:mm',
              { locale: es },
            )}`}
            descriptionNumberOfLines={2}
            left={(props) => (
              <List.Icon
                {...props}
                icon={item.status === 'open' ? 'alert-circle-outline' : 'check-circle-outline'}
                color={DISPATCH_ISSUE_STATUS_COLORS[item.status]}
              />
            )}
            onPress={() => navigation.navigate('DispatchIssueClose', { issueId: item.id })}
          />
        )}
      />
      <RoleGate permission="manageDispatchIssues">
        <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('DispatchIssueForm')} />
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
  listContent: {
    padding: 16,
    gap: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    minWidth: 100,
    flexGrow: 1,
  },
  wideCard: {
    marginBottom: 12,
  },
  cardTitle: {
    marginBottom: 12,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  legend: {
    flex: 1,
    minWidth: 150,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendLabel: {
    flex: 1,
  },
  legendCount: {
    fontWeight: '700',
  },
  itemDescription: {
    opacity: 0.7,
    marginTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
