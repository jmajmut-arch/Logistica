import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { es, registerTranslation } from 'react-native-paper-dates';

import { RootNavigator } from '@/app/navigation/RootNavigator';
import { DatabaseProvider } from '@/app/providers/DatabaseProvider';
import { paperTheme } from '@/theme';

registerTranslation('es', es);

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
