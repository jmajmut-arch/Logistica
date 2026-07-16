import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';

import { RootNavigator } from '@/app/navigation/RootNavigator';
import { DatabaseProvider } from '@/app/providers/DatabaseProvider';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <DatabaseProvider>
          <RootNavigator />
        </DatabaseProvider>
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
