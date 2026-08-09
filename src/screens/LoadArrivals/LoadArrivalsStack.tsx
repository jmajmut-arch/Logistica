import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { LoadArrivalFormScreen } from './LoadArrivalFormScreen';
import { LoadArrivalListScreen } from './LoadArrivalListScreen';

export type LoadArrivalsStackParamList = {
  LoadArrivalList: undefined;
  LoadArrivalForm: undefined;
};

const Stack = createNativeStackNavigator<LoadArrivalsStackParamList>();

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
        options={{ title: 'Registrar llegada' }}
      />
    </Stack.Navigator>
  );
}
