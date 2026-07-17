import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SessionHeaderRight } from '@/app/navigation/SessionHeaderRight';

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
    <Stack.Navigator screenOptions={{ headerRight: () => <SessionHeaderRight /> }}>
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
