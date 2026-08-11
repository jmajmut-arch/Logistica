import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { DispatchIssueCloseScreen } from './DispatchIssueCloseScreen';
import { DispatchIssueFormScreen } from './DispatchIssueFormScreen';
import { DispatchIssueListScreen } from './DispatchIssueListScreen';

export type DispatchIssuesStackParamList = {
  DispatchIssueList: undefined;
  DispatchIssueForm: undefined;
  DispatchIssueClose: { issueId: number };
};

const Stack = createNativeStackNavigator<DispatchIssuesStackParamList>();

export function DispatchIssuesStack() {
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
        name="DispatchIssueList"
        component={DispatchIssueListScreen}
        options={{ title: 'Guías con problemas' }}
      />
      <Stack.Screen
        name="DispatchIssueForm"
        component={DispatchIssueFormScreen}
        options={{ title: 'Levantar incidencia' }}
      />
      <Stack.Screen
        name="DispatchIssueClose"
        component={DispatchIssueCloseScreen}
        options={{ title: 'Detalle de la incidencia' }}
      />
    </Stack.Navigator>
  );
}
