import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { ruleRepository } from '@/data/repositories/ruleRepository';
import type { CompatibilityRule } from '@/domain/entities/CompatibilityRule';
import { normalizeClassPair } from '@/domain/rules/compatibilityRules';
import { recalculateAlerts } from '@/domain/services/alertService';
import { useSessionStore } from '@/store/sessionStore';
import { HAZARD_CLASSES, type CompatibilityStatus, type HazardClass } from '@/types/enums';
import { HAZARD_CLASS_LABELS } from '@/utils/hazardClassLabels';
import { getPermissions } from '@/utils/permissions';
import { useFocusRefresh } from '@/utils/useFocusRefresh';

type CellStatus = CompatibilityStatus | 'undefined';

const CELL_COLORS: Record<CellStatus, string> = {
  compatible: '#2E7D32',
  incompatible: '#B3261E',
  undefined: '#D1D5DB',
};

const CELL_LABELS: Record<CellStatus, string> = {
  compatible: 'Compatible',
  incompatible: 'Incompatible',
  undefined: 'Sin definir',
};

function nextStatus(current: CellStatus): CompatibilityStatus {
  return current === 'incompatible' ? 'compatible' : 'incompatible';
}

export function CompatibilityMatrixScreen() {
  const role = useSessionStore((state) => state.currentUser?.role);
  const canConfigure = role !== undefined && getPermissions(role).configureRules;

  const [rules, setRules] = useState<CompatibilityRule[] | null>(null);

  const loadData = useCallback(async () => {
    setRules(await ruleRepository.findAll());
  }, []);

  useFocusRefresh(loadData);

  const statusByPair = useMemo(() => {
    const map = new Map<string, CompatibilityStatus>();
    for (const rule of rules ?? []) {
      map.set(`${rule.classA}:${rule.classB}`, rule.status);
    }
    return map;
  }, [rules]);

  const statusFor = (classA: HazardClass, classB: HazardClass): CellStatus => {
    const [a, b] = normalizeClassPair(classA, classB);
    return statusByPair.get(`${a}:${b}`) ?? 'undefined';
  };

  const toggleCell = async (classA: HazardClass, classB: HazardClass) => {
    if (!canConfigure) {
      return;
    }
    const current = statusFor(classA, classB);
    await ruleRepository.upsert(classA, classB, nextStatus(current));
    await recalculateAlerts();
    await loadData();
  };

  if (rules === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="bodyMedium" style={styles.hint}>
        {canConfigure
          ? 'Toca una celda para alternar entre incompatible y compatible.'
          : 'Vista de solo lectura. Solo HSE puede editar la matriz.'}
      </Text>
      <ScrollView horizontal>
        <View>
          <View style={styles.row}>
            <View style={styles.cornerCell} />
            {HAZARD_CLASSES.map((hazardClass, index) => (
              <View key={hazardClass} style={styles.headerCell}>
                <Text variant="labelSmall">{index + 1}</Text>
              </View>
            ))}
          </View>
          {HAZARD_CLASSES.map((rowClass, rowIndex) => (
            <View key={rowClass} style={styles.row}>
              <View style={styles.rowHeaderCell}>
                <Text variant="labelSmall">{rowIndex + 1}</Text>
              </View>
              {HAZARD_CLASSES.map((colClass, colIndex) => {
                if (colIndex === rowIndex) {
                  return <View key={colClass} style={[styles.cell, styles.diagonalCell]} />;
                }
                const status = statusFor(rowClass, colClass);
                return (
                  <Pressable
                    key={colClass}
                    style={[styles.cell, { backgroundColor: CELL_COLORS[status] }]}
                    onPress={() => toggleCell(rowClass, colClass)}
                    disabled={!canConfigure}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        {(['compatible', 'incompatible', 'undefined'] as CellStatus[]).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: CELL_COLORS[status] }]} />
            <Text variant="bodySmall">{CELL_LABELS[status]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.classList}>
        {HAZARD_CLASSES.map((hazardClass, index) => (
          <Text key={hazardClass} variant="bodySmall" style={styles.classListItem}>
            {index + 1}. {HAZARD_CLASS_LABELS[hazardClass]}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginBottom: 12,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
  },
  cornerCell: {
    width: CELL_SIZE * 1.5,
    height: CELL_SIZE,
  },
  headerCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHeaderCell: {
    width: CELL_SIZE * 1.5,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: 1,
    borderRadius: 2,
  },
  diagonalCell: {
    backgroundColor: 'transparent',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  classList: {
    marginTop: 16,
    gap: 4,
  },
  classListItem: {
    opacity: 0.8,
  },
});
