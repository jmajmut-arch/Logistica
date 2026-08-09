import type { RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { UserFormScreen } from './UserFormScreen';
import { UserListScreen } from './UserListScreen';

export type UsersStackParamList = {
  UserList: undefined;
  UserForm: { userId?: number } | undefined;
};

const Stack = createNativeStackNavigator<UsersStackParamList>();

function formTitle(route: RouteProp<UsersStackParamList, 'UserForm'>): string {
  return route.params?.userId ? 'Editar persona' : 'Nueva persona';
}

export function UsersStack() {
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
      <Stack.Screen name="UserList" component={UserListScreen} options={{ title: 'Personas' }} />
      <Stack.Screen
        name="UserForm"
        component={UserFormScreen}
        options={({ route }) => ({ title: formTitle(route) })}
      />
    </Stack.Navigator>
  );
}
