import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { AlertsScreen } from '@/screens/Alerts/AlertsScreen';
import { CompatibilityMatrixScreen } from '@/screens/CompatibilityMatrix/CompatibilityMatrixScreen';
import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { StorageLimitsScreen } from '@/screens/StorageLimits/StorageLimitsScreen';
import { SubstancesStack } from '@/screens/Substances/SubstancesStack';

export type AppTabsParamList = {
  Dashboard: undefined;
  Substances: undefined;
  CompatibilityMatrix: undefined;
  StorageLimits: undefined;
  Alerts: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

const TAB_ICONS: Record<keyof AppTabsParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Dashboard: 'view-dashboard-outline',
  Substances: 'flask-outline',
  CompatibilityMatrix: 'grid',
  StorageLimits: 'gauge',
  Alerts: 'alert-circle-outline',
};

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={TAB_ICONS[route.name as keyof AppTabsParamList]}
            color={color}
            size={size}
          />
        ),
        headerRight: () => <SessionHeaderRight />,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="Substances"
        component={SubstancesStack}
        options={{ title: 'Sustancias', headerShown: false }}
      />
      <Tab.Screen
        name="CompatibilityMatrix"
        component={CompatibilityMatrixScreen}
        options={{ title: 'Compatibilidad' }}
      />
      <Tab.Screen
        name="StorageLimits"
        component={StorageLimitsScreen}
        options={{ title: 'Límites' }}
      />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alertas' }} />
    </Tab.Navigator>
  );
}
