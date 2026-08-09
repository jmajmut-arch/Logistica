import { StyleSheet } from 'react-native';
import { Badge } from 'react-native-paper';

import type { TruckArrivalStatus } from '@/domain/rules/truckArrivalStatus';
import { TRUCK_STATUS_COLORS, TRUCK_STATUS_LABELS } from '@/utils/truckArrivalDisplay';

interface TruckStatusBadgeProps {
  status: TruckArrivalStatus;
}

export function TruckStatusBadge({ status }: TruckStatusBadgeProps) {
  return (
    <Badge style={[styles.badge, { backgroundColor: TRUCK_STATUS_COLORS[status] }]} size={22}>
      {TRUCK_STATUS_LABELS[status]}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
});
