import type { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { useAppPalette } from '@/store/themeStore';

import { CarrierFormScreen } from './CarrierFormScreen';
import { CarrierListScreen } from './CarrierListScreen';

export type CarriersStackParamList = {
  CarrierList: undefined;
  CarrierForm: { carrierId?: number } | undefined;
};

const Stack = createNativeStackNavigator<CarriersStackParamList>();

function formTitle(route: RouteProp<CarriersStackParamList, 'CarrierForm'>): string {
  return route.params?.carrierId ? 'Editar empresa' : 'Nueva empresa';
}

export function CarriersStack() {
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
      <Stack.Screen name="CarrierList" component={CarrierListScreen} options={{ title: 'Empresas' }} />
      <Stack.Screen
        name="CarrierForm"
        component={CarrierFormScreen}
        options={({ route }) => ({ title: formTitle(route) })}
      />
    </Stack.Navigator>
  );
}
