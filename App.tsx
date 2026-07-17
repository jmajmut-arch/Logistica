import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';

import { RootNavigator } from '@/app/navigation/RootNavigator';
import { DatabaseProvider } from '@/app/providers/DatabaseProvider';
import { paperTheme } from '@/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <DatabaseProvider>
          <RootNavigator />
        </DatabaseProvider>
        <StatusBar style="light" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
