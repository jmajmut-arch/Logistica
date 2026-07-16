import { StyleSheet } from 'react-native';
import { Badge } from 'react-native-paper';

import { SEVERITY_COLORS, SEVERITY_LABELS } from '@/utils/alertDisplay';
import type { AlertSeverity } from '@/types/enums';

interface SeverityBadgeProps {
  severity: AlertSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge style={[styles.badge, { backgroundColor: SEVERITY_COLORS[severity] }]} size={22}>
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
});
