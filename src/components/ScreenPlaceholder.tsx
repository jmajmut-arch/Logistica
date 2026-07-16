import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ScreenPlaceholderProps {
  title: string;
  description: string;
}

export function ScreenPlaceholder({ title, description }: ScreenPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">{title}</Text>
      <Text variant="bodyMedium" style={styles.description}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  description: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
