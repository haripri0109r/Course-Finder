import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { NotificationProvider } from './src/context/NotificationContext';
import Toast from './src/components/Toast';
import { COLORS, SPACING, FONTS } from './src/utils/theme';
import * as Notifications from 'expo-notifications';
import { navigationRef } from './src/navigation/navigationRef';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  const { isConnected } = useNetInfo();

  React.useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      console.log("Permission:", status);
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <NavigationContainer ref={navigationRef}>
                <ErrorBoundary>
                  <AppNavigator />
                </ErrorBoundary>
              </NavigationContainer>
              {isConnected === false && (
                <View style={styles.offlineBanner}>
                  <Text style={styles.offlineText}>📡 No Internet Connection</Text>
                </View>
              )}
            </NotificationProvider>
            <Toast />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: 50,
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: COLORS.danger,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  offlineText: {
    color: '#fff',
    fontWeight: 'bold',
    ...FONTS.small,
  }
});
