import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { useAppPalette } from '@/store/themeStore';

import { SiteFormScreen } from './SiteFormScreen';
import { SiteListScreen } from './SiteListScreen';

export type SitesStackParamList = {
  SiteList: undefined;
  SiteForm: { siteId?: number } | undefined;
};

const Stack = createNativeStackNavigator<SitesStackParamList>();

function siteFormTitle(route: RouteProp<SitesStackParamList, 'SiteForm'>): string {
  return route.params?.siteId ? 'Editar sitio' : 'Nuevo sitio';
}

export function SitesStack() {
  const PALETTE = useAppPalette();
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
      <Stack.Screen
        name="SiteForm"
        component={SiteFormScreen}
        options={({ route }) => ({ title: siteFormTitle(route) })}
      />
    </Stack.Navigator>
  );
}
