import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, FONTS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { showToast } from '../components/Toast';
import api from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.forgotPassword(email.trim());
      if (res.data?.success) {
        setSent(true);
        showToast({ message: res.data.message || 'Check your email', type: 'success' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Try again.';
      showToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={{ color: colors.accent, ...FONTS.captionBold }}>← Back to sign in</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Reset password</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Enter the email you used to register. If an account exists, you will receive reset instructions.
          </Text>

          {sent ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.success, { color: colors.textPrimary }]}>
                Request received. If an account exists for {email}, follow the instructions sent to your inbox.
              </Text>
              <PrimaryButton title="Back to sign in" onPress={() => navigation.goBack()} style={{ marginTop: SPACING.lg }} />
            </View>
          ) : (
            <>
              <InputField
                label="Work email"
                placeholder="you@company.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email}
              />
              <PrimaryButton title="Send reset link" onPress={submit} loading={loading} fullWidth />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.xl, paddingTop: SPACING.md },
  back: { marginBottom: SPACING.xl },
  title: { ...FONTS.h1, marginBottom: SPACING.sm },
  sub: { ...FONTS.body, marginBottom: SPACING['3xl'], lineHeight: 22 },
  card: {
    padding: SPACING.xl,
    borderRadius: 12,
    borderWidth: 1,
  },
  success: { ...FONTS.body, lineHeight: 22 },
});
