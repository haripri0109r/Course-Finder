import 'react-native-reanimated';
import React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { NotificationProvider } from './src/context/NotificationContext';
import Toast from './src/components/Toast';
import OfflineBanner from './src/components/OfflineBanner';
import { navigationRef } from './src/navigation/navigationRef';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Guard native-only module for web
let Notifications;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
}

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  React.useEffect(() => {
    if (!Notifications) return;
    const requestPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
    };

    requestPermission();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const postId = response.notification.request.content.data?.postId;
      if (postId) {
        navigationRef.current?.navigate("PostDetail", { postId });
      }
    });

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NetworkProvider>
            <AuthProvider>
              <NotificationProvider>
                <NavigationContainer ref={navigationRef}>
                  <ErrorBoundary>
                    <AppNavigator />
                    <OfflineBanner />
                  </ErrorBoundary>
                </NavigationContainer>
              </NotificationProvider>
              <Toast />
            </AuthProvider>
          </NetworkProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
