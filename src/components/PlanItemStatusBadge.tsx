import { StyleSheet } from 'react-native';
import { Badge } from 'react-native-paper';

import type { DisplayStatus } from '@/domain/rules/complianceStatus';
import { DISPLAY_STATUS_COLORS, DISPLAY_STATUS_LABELS } from '@/utils/transportPlanDisplay';

interface PlanItemStatusBadgeProps {
  status: DisplayStatus;
}

export function PlanItemStatusBadge({ status }: PlanItemStatusBadgeProps) {
  return (
    <Badge style={[styles.badge, { backgroundColor: DISPLAY_STATUS_COLORS[status] }]} size={22}>
      {DISPLAY_STATUS_LABELS[status]}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
});
