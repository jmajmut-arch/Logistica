import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { HEAVY_CRANE_COLOR, HEAVY_CRANE_LABEL_SHORT } from '@/utils/transportPlanDisplay';

export function HeavyCraneBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="crane" size={compact ? 14 : 16} color={HEAVY_CRANE_COLOR} />
      {!compact && (
        <Text variant="labelSmall" style={styles.label}>
          {HEAVY_CRANE_LABEL_SHORT}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: HEAVY_CRANE_COLOR,
    fontWeight: '700',
  },
});
