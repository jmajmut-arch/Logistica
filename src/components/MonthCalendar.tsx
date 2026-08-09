import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { PALETTE } from '@/theme';
import { startOfWeek } from '@/utils/timeBlocks';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function getMonthGridDays(monthDate: Date): number[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1).getTime();
  const lastOfMonth = new Date(year, month + 1, 0).getTime();
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = startOfWeek(lastOfMonth) + 7 * DAY_MS;
  const days: number[] = [];
  for (let t = gridStart; t < gridEnd; t += DAY_MS) {
    days.push(t);
  }
  return days;
}

export interface MonthCalendarProps {
  month: Date;
  onChangeMonth: (delta: 1 | -1) => void;
  countsByDay: Map<number, number>;
  selectedDay: number | null;
  onSelectDay: (dayStart: number) => void;
  today: number;
}

export function MonthCalendar({
  month,
  onChangeMonth,
  countsByDay,
  selectedDay,
  onSelectDay,
  today,
}: MonthCalendarProps) {
  const days = useMemo(() => getMonthGridDays(month), [month]);
  const currentMonthIndex = month.getMonth();

  return (
    <View>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => onChangeMonth(-1)} />
        <Text variant="titleMedium">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </Text>
        <IconButton icon="chevron-right" onPress={() => onChangeMonth(1)} />
      </View>
      <View style={styles.weekHeaderRow}>
        {WEEKDAY_HEADERS.map((label) => (
          <Text key={label} variant="labelSmall" style={styles.weekHeaderCell}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const inMonth = new Date(day).getMonth() === currentMonthIndex;
          const count = countsByDay.get(day) ?? 0;
          const isToday = day === today;
          const isSelected = day === selectedDay;
          return (
            <Pressable
              key={day}
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => onSelectDay(day)}
            >
              <Text
                variant="bodyMedium"
                style={[styles.cellText, !inMonth && styles.cellTextMuted, isToday && styles.cellTextToday]}
              >
                {new Date(day).getDate()}
              </Text>
              {count > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekHeaderRow: {
    flexDirection: 'row',
  },
  weekHeaderCell: {
    flex: 1,
    textAlign: 'center',
    opacity: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellSelected: {
    backgroundColor: 'rgba(251,146,60,0.18)',
    borderRadius: 8,
  },
  cellText: {},
  cellTextMuted: {
    opacity: 0.3,
  },
  cellTextToday: {
    color: PALETTE.primary,
    fontWeight: '700',
  },
  countBadge: {
    marginTop: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PALETTE.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countBadgeText: {
    color: PALETTE.onPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
});
