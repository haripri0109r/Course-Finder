import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { NotificationProvider } from './src/context/NotificationContext';
import Toast from './src/components/Toast';
import { COLORS, SPACING, FONTS } from './src/utils/theme';

export default function App() {
  const { isConnected } = useNetInfo();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppNavigator />
          {isConnected === false && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>📡 No Internet Connection</Text>
          </View>
        )}
          <Toast />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
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
