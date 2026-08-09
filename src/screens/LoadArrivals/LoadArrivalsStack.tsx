import type { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { LoadArrivalFormScreen } from './LoadArrivalFormScreen';
import { LoadArrivalListScreen } from './LoadArrivalListScreen';

export type LoadArrivalsStackParamList = {
  LoadArrivalList: undefined;
  LoadArrivalForm: { arrivalId?: number } | undefined;
};

const Stack = createNativeStackNavigator<LoadArrivalsStackParamList>();

function formTitle(route: RouteProp<LoadArrivalsStackParamList, 'LoadArrivalForm'>): string {
  return route.params?.arrivalId ? 'Editar llegada' : 'Registrar llegada';
}

export function LoadArrivalsStack() {
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
