import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';
import InputField from '../components/InputField';
import { SPACING, FONTS } from '../utils/theme';
import api from '../utils/api';
import { showToast } from '../components/Toast';

export default function ResetPasswordScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const token = route.params?.token || '';
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password) {
      showToast({ message: 'Password is required', type: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      showToast({ message: 'Password reset successfully. You can now login.', type: 'success' });
      navigation.replace('Login');
    } catch (e) {
      showToast({ message: e.response?.data?.message || 'Failed to reset password', type: 'error' });
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Reset Password</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.instruction, { color: colors.textSecondary }]}>
          Enter your new password below. You will be logged out of all devices.
        </Text>
        
        <InputField
          label="New Password"
          placeholder="Enter new password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          iconName="lock-closed-outline"
        />

        <PrimaryButton title="Set New Password" onPress={handleReset} loading={loading} style={{ marginTop: SPACING.lg }} />
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
