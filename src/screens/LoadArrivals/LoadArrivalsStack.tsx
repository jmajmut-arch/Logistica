import type { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { useAppPalette } from '@/store/themeStore';

import { LoadArrivalFormScreen } from './LoadArrivalFormScreen';
import { LoadArrivalListScreen } from './LoadArrivalListScreen';

export type LoadArrivalsStackParamList = {
  LoadArrivalList: undefined;
  LoadArrivalForm:
    | { arrivalId?: number; planItemId?: number; openUnplanned?: boolean; openBackdated?: boolean }
    | undefined;
};

const Stack = createNativeStackNavigator<LoadArrivalsStackParamList>();

function formTitle(route: RouteProp<LoadArrivalsStackParamList, 'LoadArrivalForm'>): string {
  return route.params?.arrivalId ? 'Editar llegada' : 'Registrar llegada';
}

export function LoadArrivalsStack() {
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
      <Stack.Screen
        name="LoadArrivalList"
        component={LoadArrivalListScreen}
        options={{ title: 'Llegada de cargas' }}
      />
      <Stack.Screen
        name="LoadArrivalForm"
        component={LoadArrivalFormScreen}
        options={({ route }) => ({ title: formTitle(route) })}
      />
    </Stack.Navigator>
  );
}
