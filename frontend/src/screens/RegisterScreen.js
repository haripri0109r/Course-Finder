import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { showToast } from '../components/Toast';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!name) newErrors.name = 'Name required';
    if (!email) newErrors.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';
    if (!password) newErrors.password = 'Password required';
    else if (password.length < 6) newErrors.password = 'Min 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await register(name, email, password);
      showToast({ message: 'Account created! Welcome 🎉', type: 'success' });
    } catch (err) {
      showToast({ message: 'Registration failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Join us</Text>
            <Text style={styles.subtitle}>Start sharing your learning journey with the world.</Text>
          </View>

          <View style={styles.formCard}>
            <InputField
              label="Full Name"
              placeholder="Jane Doe"
              value={name}
              onChangeText={setName}
              error={errors.name}
              icon="👤"
            />

            <InputField
              label="Email"
              placeholder="jane@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.email}
              icon="✉️"
            />

            <InputField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
              icon="🔒"
            />

            <PrimaryButton 
              title="Create Account" 
              onPress={handleRegister} 
              loading={loading} 
              fullWidth 
              style={styles.submit}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, justifyContent: 'center', paddingVertical: 40 },
  header: { alignItems: 'flex-start', marginBottom: SPACING['3xl'], paddingHorizontal: SPACING.sm },
  title: { ...FONTS.display, fontSize: 32, color: COLORS.primary },
  subtitle: { ...FONTS.body, color: COLORS.textMuted, marginTop: 8 },
  formCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xxl, padding: SPACING.xxl, ...SHADOW.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  submit: { marginTop: SPACING.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING['3xl'] },
  footerText: { ...FONTS.body, color: COLORS.textSecondary },
  footerLink: { ...FONTS.bodyBold, color: COLORS.accent },
});
