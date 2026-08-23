import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { LoginScreen } from '@/screens/Login/LoginScreen';
import { useSessionHydrated, useSessionStore } from '@/store/sessionStore';
import { useAppPalette } from '@/store/themeStore';
import { buildNavigationTheme } from '@/theme';

import { AppTabs } from './AppTabs';

export type RootStackParamList = {
  Login: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const currentUser = useSessionStore((state) => state.currentUser);
  const sessionHydrated = useSessionHydrated();
  const palette = useAppPalette();
  const navigationTheme = useMemo(() => buildNavigationTheme(palette), [palette]);

  if (!sessionHydrated) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}
      >
        {currentUser ? (
          <Stack.Screen name="App" component={AppTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
