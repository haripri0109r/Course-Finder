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

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const { colors, isDark } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';
    if (!password) newErrors.password = 'Password required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await login(email.trim(), password, rememberMe);
      showToast({ message: 'Welcome back!', type: 'success' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      showToast({ message: msg, type: 'error' });
      if (err.response?.status === 401) {
        setErrors((e) => ({ ...e, password: 'Check your email and password' }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoEmoji}>🎓</Text>
            </View>
            <Text style={[styles.welcomeText, { color: colors.textPrimary }]}>Welcome back</Text>
            <Text style={[styles.subText, { color: colors.textSecondary }]}>Sign in to continue your learning journey.</Text>
          </View>

          <View style={styles.formSection}>
            <InputField
              label="Email Address"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.email}
              icon="✉️"
            />

            <InputField
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              icon="🔒"
              suffix={showPassword ? "👁️" : "👁️‍🗨️"}
              onSuffixPress={() => setShowPassword(!showPassword)}
            />

            <View style={styles.rememberRow}>
              <Text style={[styles.rememberLabel, { color: colors.textSecondary }]}>Remember me</Text>
              <Switch value={rememberMe} onValueChange={setRememberMe} trackColor={{ false: colors.border, true: colors.accentLight }} thumbColor={rememberMe ? colors.accent : colors.surface} />
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={[styles.forgotText, { color: colors.accent }]}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton 
              title="Sign In" 
              onPress={handleLogin} 
              loading={loading} 
              fullWidth 
              style={styles.signInBtn}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.footerLink, { color: colors.accent }]}>Join now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: { 
    flex: 1 
  },
  scroll: { 
    flexGrow: 1, 
    paddingHorizontal: SPACING['2xl'], 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: SPACING['4xl'] 
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOW.md,
  },
  logoEmoji: { 
    fontSize: 36 
  },
  welcomeText: {
    ...FONTS.h1,
    fontSize: 32,
  },
  subText: {
    ...FONTS.body,
    marginTop: 8,
    textAlign: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  rememberLabel: { ...FONTS.body },
  formSection: { 
    width: '100%',
  },
  forgotBtn: { 
    alignSelf: 'flex-end', 
    marginBottom: SPACING.xl 
  },
  forgotText: {
    ...FONTS.tiny,
    fontWeight: '600',
  },
  signInBtn: { 
    marginTop: SPACING.md 
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: SPACING['4xl'] 
  },
  footerLabel: {
    ...FONTS.body,
  },
  footerLink: {
    ...FONTS.bodyBold,
  },
});
