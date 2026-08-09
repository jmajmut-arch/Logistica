import type { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { TransportPlanFormScreen } from './TransportPlanFormScreen';
import { TransportPlanListScreen } from './TransportPlanListScreen';

export type TransportPlanStackParamList = {
  TransportPlanList: undefined;
  TransportPlanForm: { planItemId?: number } | undefined;
};

const Stack = createNativeStackNavigator<TransportPlanStackParamList>();

function formTitle(route: RouteProp<TransportPlanStackParamList, 'TransportPlanForm'>): string {
  return route.params?.planItemId ? 'Editar item del plan' : 'Nuevo item del plan';
}

export function TransportPlanStack() {
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
        name="TransportPlanList"
        component={TransportPlanListScreen}
        options={{ title: 'Plan semanal' }}
      />
      <Stack.Screen
        name="TransportPlanForm"
        component={TransportPlanFormScreen}
        options={({ route }) => ({ title: formTitle(route) })}
      />
    </Stack.Navigator>
  );
}
