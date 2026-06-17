import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, FONTS } from '../utils/theme';
import api from '../utils/api';

export default function VerificationSuccessScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const token = route.params?.token || '';
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const verify = async () => {
      try {
        await api.post(`/auth/verify-email/${token}`);
        setStatus('success');
      } catch (e) {
        setStatus('error');
      }
    };
    verify();
  }, [token]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {status === 'verifying' && (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.message, { color: colors.textPrimary, marginTop: SPACING.lg }]}>
              Verifying your email...
            </Text>
          </>
        )}
        
        {status === 'success' && (
          <>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            <Text style={[styles.title, { color: colors.textPrimary }]}>Email Verified!</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Your account is now fully verified.
            </Text>
            <PrimaryButton title="Continue to Home" onPress={() => navigation.replace('Main')} style={{ marginTop: SPACING.xl, width: '100%' }} />
          </>
        )}

        {status === 'error' && (
          <>
            <Ionicons name="close-circle" size={80} color="#EF4444" />
            <Text style={[styles.title, { color: colors.textPrimary }]}>Verification Failed</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              The link is invalid or has expired.
            </Text>
            <PrimaryButton title="Go to Login" onPress={() => navigation.replace('Login')} style={{ marginTop: SPACING.xl, width: '100%' }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: SPACING.xl, alignItems: 'center', justifyContent: 'center' },
  title: { ...FONTS.h2, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  message: { ...FONTS.body, textAlign: 'center' },
});
