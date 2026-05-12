import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { showToast } from '../components/Toast';

export default function RegisterScreen({ navigation }) {
  const { register } = useContext(AuthContext);
  const { colors, isDark } = useAppTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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
      await register(name.trim(), email.trim(), password, rememberMe);
      showToast({ message: 'Account created! Welcome 🎉', type: 'success' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      showToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>Join us</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Start sharing your learning journey with the world.</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
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

            <View style={styles.rememberRow}>
              <Text style={[styles.rememberLabel, { color: colors.textSecondary }]}>Stay signed in on this device</Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={rememberMe ? colors.accent : colors.surface}
              />
            </View>

            <PrimaryButton 
              title="Create Account" 
              onPress={handleRegister} 
              loading={loading} 
              fullWidth 
              style={styles.submit}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.footerLink, { color: colors.accent }]}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, justifyContent: 'center', paddingVertical: 40 },
  header: { alignItems: 'flex-start', marginBottom: SPACING['3xl'], paddingHorizontal: SPACING.sm },
  title: { ...FONTS.display, fontSize: 32 },
  subtitle: { ...FONTS.body, marginTop: 8 },
  formCard: { borderRadius: RADIUS.xxl, padding: SPACING.xxl, ...SHADOW.sm, borderWidth: 1 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rememberLabel: { ...FONTS.small, flex: 1, marginRight: SPACING.md },
  submit: { marginTop: SPACING.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING['3xl'] },
  footerText: { ...FONTS.body },
  footerLink: { ...FONTS.bodyBold },
});
