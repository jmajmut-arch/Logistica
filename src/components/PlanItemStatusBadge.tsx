import { StyleSheet } from 'react-native';
import { Badge } from 'react-native-paper';

import type { PlanItemStatus } from '@/domain/rules/complianceStatus';
import { PLAN_ITEM_STATUS_COLORS, PLAN_ITEM_STATUS_LABELS } from '@/utils/transportPlanDisplay';

interface PlanItemStatusBadgeProps {
  status: PlanItemStatus;
}

export function PlanItemStatusBadge({ status }: PlanItemStatusBadgeProps) {
  return (
    <Badge style={[styles.badge, { backgroundColor: PLAN_ITEM_STATUS_COLORS[status] }]} size={22}>
      {PLAN_ITEM_STATUS_LABELS[status]}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
});
