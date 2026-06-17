import React, { useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, FONTS } from '../utils/theme';
import { AuthContext } from '../context/AuthContext';

export default function VerificationPendingScreen({ navigation }) {
  const { colors } = useAppTheme();
  const { user } = useContext(AuthContext);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Ionicons name="mail-unread-outline" size={80} color={colors.accent} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>Verify your email</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          We've sent an email to <Text style={{ fontWeight: 'bold' }}>{user?.email}</Text>. Please click the link inside to verify your account and unlock all features.
        </Text>
        
        <PrimaryButton 
          title="Resend Email" 
          onPress={() => navigation.navigate('ResendVerification')} 
          variant="outline"
          style={{ marginTop: SPACING.xl, width: '100%' }} 
        />
        <PrimaryButton 
          title="Continue to Home (Limited)" 
          onPress={() => navigation.replace('Main')} 
          style={{ marginTop: SPACING.md, width: '100%' }} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: SPACING.xl, alignItems: 'center', justifyContent: 'center' },
  title: { ...FONTS.h2, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  message: { ...FONTS.body, textAlign: 'center', lineHeight: 22 },
});
