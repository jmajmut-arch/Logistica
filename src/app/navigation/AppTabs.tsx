import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { AlertsScreen } from '@/screens/Alerts/AlertsScreen';
import { CompatibilityMatrixScreen } from '@/screens/CompatibilityMatrix/CompatibilityMatrixScreen';
import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { FieldVerificationsStack } from '@/screens/FieldVerifications/FieldVerificationsStack';
import { StorageLimitsScreen } from '@/screens/StorageLimits/StorageLimitsScreen';
import { SubstancesStack } from '@/screens/Substances/SubstancesStack';
import { TruckArrivalsStack } from '@/screens/TruckArrivals/TruckArrivalsStack';
import { PALETTE } from '@/theme';

export type AppTabsParamList = {
  Dashboard: undefined;
  Substances: undefined;
  CompatibilityMatrix: undefined;
  StorageLimits: undefined;
  FieldVerifications: undefined;
  TruckArrivals: undefined;
  Alerts: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

const TAB_ICONS: Record<keyof AppTabsParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Dashboard: 'view-dashboard-outline',
  Substances: 'flask-outline',
  CompatibilityMatrix: 'grid',
  StorageLimits: 'gauge',
  FieldVerifications: 'clipboard-check-outline',
  TruckArrivals: 'truck-outline',
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
        headerStyle: { backgroundColor: PALETTE.surface },
        headerTintColor: PALETTE.text,
        headerTitleStyle: { color: PALETTE.text },
        sceneStyle: { backgroundColor: PALETTE.background },
        tabBarStyle: { backgroundColor: PALETTE.surface, borderTopColor: PALETTE.border },
        tabBarActiveTintColor: PALETTE.primary,
        tabBarInactiveTintColor: PALETTE.textMuted,
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
      <Tab.Screen
        name="FieldVerifications"
        component={FieldVerificationsStack}
        options={{ title: 'Verificaciones', headerShown: false }}
      />
      <Tab.Screen
        name="TruckArrivals"
        component={TruckArrivalsStack}
        options={{ title: 'Camiones', headerShown: false }}
      />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alertas' }} />
    </Tab.Navigator>
  );
}
