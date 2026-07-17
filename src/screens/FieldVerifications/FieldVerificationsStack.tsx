import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';
import { PALETTE } from '@/theme';

import { FieldVerificationDetailScreen } from './FieldVerificationDetailScreen';
import { FieldVerificationFormScreen } from './FieldVerificationFormScreen';
import { FieldVerificationListScreen } from './FieldVerificationListScreen';

export type FieldVerificationsStackParamList = {
  FieldVerificationList: undefined;
  FieldVerificationForm: undefined;
  FieldVerificationDetail: { verificationId: number };
};

const Stack = createNativeStackNavigator<FieldVerificationsStackParamList>();

export function FieldVerificationsStack() {
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
        name="FieldVerificationList"
        component={FieldVerificationListScreen}
        options={{ title: 'Verificaciones en terreno' }}
      />
      <Stack.Screen
        name="FieldVerificationForm"
        component={FieldVerificationFormScreen}
        options={{ title: 'Nueva verificación' }}
      />
      <Stack.Screen
        name="FieldVerificationDetail"
        component={FieldVerificationDetailScreen}
        options={{ title: 'Detalle de verificación' }}
      />
    </Stack.Navigator>
  );
}
