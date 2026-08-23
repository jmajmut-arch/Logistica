import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { CarriersStack } from '@/screens/Carriers/CarriersStack';
import { DashboardScreen } from '@/screens/Dashboard/DashboardScreen';
import { HistoricalScreen } from '@/screens/Historical/HistoricalScreen';
import { LoadArrivalsStack } from '@/screens/LoadArrivals/LoadArrivalsStack';
import { SitesStack } from '@/screens/Sites/SitesStack';
import { ThemeSettingsScreen } from '@/screens/ThemeSettings/ThemeSettingsScreen';
import { TransportPlanStack } from '@/screens/TransportPlan/TransportPlanStack';
import { UsersStack } from '@/screens/Users/UsersStack';
import { useSessionStore } from '@/store/sessionStore';
import { useAppPalette } from '@/store/themeStore';

export type AppTabsParamList = {
  Dashboard: undefined;
  Historical: undefined;
  TransportPlan: undefined;
  HomeDeliveryPlan: undefined;
  Sites: undefined;
  Carriers: undefined;
  Users: undefined;
  LoadArrivals: undefined;
  DispatchIssues: undefined;
  ThemeSettings: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

const TAB_ICONS: Record<keyof AppTabsParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Dashboard: 'view-dashboard-outline',
  Historical: 'chart-line',
  TransportPlan: 'calendar-clock-outline',
  HomeDeliveryPlan: 'home-city-outline',
  Sites: 'warehouse',
  Carriers: 'domain',
  Users: 'account-group-outline',
  LoadArrivals: 'package-variant-closed',
  DispatchIssues: 'file-alert-outline',
  ThemeSettings: 'palette-outline',
};

export function AppTabs() {
  const role = useSessionStore((state) => state.currentUser?.role);
  const PALETTE = useAppPalette();

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
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Historical" component={HistoricalScreen} options={{ title: 'Histórico' }} />
      {role === 'admin' && (
        <Tab.Screen name="TransportPlan" options={{ title: 'Plan semanal de transporte', headerShown: false }}>
          {() => <TransportPlanStack scope="plan_transporte" />}
        </Tab.Screen>
      )}
      {role === 'operator' && (
        <Tab.Screen
          name="LoadArrivals"
          component={LoadArrivalsStack}
          options={{ title: 'Llegadas', headerShown: false }}
        />
      )}
      {role === 'admin' && (
        <Tab.Screen name="HomeDeliveryPlan" options={{ title: 'Home delivery', headerShown: false }}>
          {() => <TransportPlanStack scope="home_delivery" />}
        </Tab.Screen>
      )}
      {role === 'admin' && (
        <Tab.Screen
          name="Sites"
          component={SitesStack}
          options={{ title: 'Sitios', headerShown: false }}
        />
      )}
      {role === 'admin' && (
        <Tab.Screen
          name="Carriers"
          component={CarriersStack}
          options={{ title: 'Empresas', headerShown: false }}
        />
      )}
      {role === 'admin' && (
        <Tab.Screen
          name="Users"
          component={UsersStack}
          options={{ title: 'Personas', headerShown: false }}
        />
      )}
      {role === 'admin' && (
        <Tab.Screen
          name="ThemeSettings"
          component={ThemeSettingsScreen}
          options={{ title: 'Colores' }}
        />
      )}
    </Tab.Navigator>
  );
}
