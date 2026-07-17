import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { SubstanceFormScreen } from './SubstanceFormScreen';
import { SubstanceListScreen } from './SubstanceListScreen';

export type SubstancesStackParamList = {
  SubstanceList: undefined;
  SubstanceForm: { substanceId: number } | undefined;
};

const Stack = createNativeStackNavigator<SubstancesStackParamList>();

export function SubstancesStack() {
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
        name="SubstanceList"
        component={SubstanceListScreen}
        options={{ title: 'Sustancias' }}
      />
      <Stack.Screen
        name="SubstanceForm"
        component={SubstanceFormScreen}
        options={({ route }) => ({
          title: route.params?.substanceId ? 'Editar sustancia' : 'Nueva sustancia',
        })}
      />
    </Stack.Navigator>
  );
}
