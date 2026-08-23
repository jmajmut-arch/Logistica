import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { getComplianceColor } from '@/utils/transportPlanDisplay';

export interface WeekBarChartDay {
  label: string;
  percentage: number | null;
  highlight?: boolean;
  onPress?: () => void;
}

interface WeekBarChartProps {
  data: WeekBarChartDay[];
  maxHeight?: number;
}

export function WeekBarChart({ data, maxHeight = 96 }: WeekBarChartProps) {
  return (
    <View style={styles.row}>
      {data.map((day) => {
        const color = getComplianceColor(day.percentage);
        const height = day.percentage === null ? 4 : Math.max(4, (day.percentage / 100) * maxHeight);
        return (
          <Pressable key={day.label} style={styles.column} onPress={day.onPress}>
            <Text variant="labelSmall" style={styles.value}>
              {day.percentage === null ? '—' : `${day.percentage}%`}
            </Text>
            <View style={[styles.track, { height: maxHeight }]}>
              <View style={[styles.bar, { height, backgroundColor: color }]} />
            </View>
            <Text
              variant="labelSmall"
              style={[styles.label, day.highlight && { color: getComplianceColor(day.percentage) }]}
            >
              {day.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    marginBottom: 4,
    opacity: 0.8,
  },
  track: {
    width: '100%',
    maxWidth: 28,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(148,163,184,0.15)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  label: {
    marginTop: 6,
    opacity: 0.7,
    fontWeight: '600',
  },
});
