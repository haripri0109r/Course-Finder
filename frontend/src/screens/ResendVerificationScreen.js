import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';
import InputField from '../components/InputField';
import { SPACING, FONTS } from '../utils/theme';
import api from '../utils/api';
import { showToast } from '../components/Toast';

export default function ResendVerificationScreen({ navigation }) {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email) {
      showToast({ message: 'Email is required', type: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/auth/resend-verification`, { email });
      showToast({ message: 'Verification email sent if account exists and is unverified.', type: 'success' });
      navigation.goBack();
    } catch (e) {
      showToast({ message: e.response?.data?.message || 'Failed to resend', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Resend Verification</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          Enter your email address to receive a new verification link.
        </Text>
        
        <InputField
          label="Email"
          placeholder="Enter your email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          iconName="mail-outline"
        />

        <PrimaryButton title="Send Link" onPress={handleResend} loading={loading} style={{ marginTop: SPACING.lg }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerTitle: { ...FONTS.h3 },
  content: { padding: SPACING.xl },
  instruction: { ...FONTS.body, marginBottom: SPACING.xl },
});
