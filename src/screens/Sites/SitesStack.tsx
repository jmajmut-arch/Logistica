import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { SiteFormScreen } from './SiteFormScreen';
import { SiteListScreen } from './SiteListScreen';

export type SitesStackParamList = {
  SiteList: undefined;
  SiteForm: undefined;
};

const Stack = createNativeStackNavigator<SitesStackParamList>();

export function SitesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <SessionHeaderRight />,
        headerStyle: { backgroundColor: PALETTE.surface },
        headerTintColor: PALETTE.text,
        headerTitleStyle: { color: PALETTE.text },
        contentStyle: { backgroundColor: PALETTE.background },
      }}
    >
      <Stack.Screen name="SiteList" component={SiteListScreen} options={{ title: 'Patios y bodegas' }} />
      <Stack.Screen name="SiteForm" component={SiteFormScreen} options={{ title: 'Nuevo sitio' }} />
    </Stack.Navigator>
  );
}
