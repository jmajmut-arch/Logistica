import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { TruckArrivalFormScreen } from './TruckArrivalFormScreen';
import { TruckArrivalListScreen } from './TruckArrivalListScreen';

export type TruckArrivalsStackParamList = {
  TruckArrivalList: undefined;
  TruckArrivalForm: undefined;
};

const Stack = createNativeStackNavigator<TruckArrivalsStackParamList>();

export function TruckArrivalsStack() {
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
        name="TruckArrivalList"
        component={TruckArrivalListScreen}
        options={{ title: 'Llegada de camiones' }}
      />
      <Stack.Screen
        name="TruckArrivalForm"
        component={TruckArrivalFormScreen}
        options={{ title: 'Registrar llegada' }}
      />
    </Stack.Navigator>
  );
}
