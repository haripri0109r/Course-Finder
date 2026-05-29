import React, { useState, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AuthContext } from '../context/AuthContext';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { showToast } from '../components/Toast';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
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
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {/* Logo + Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
            <View style={s.logoCircle}>
              <Ionicons name="school" size={32} color={colors.white} />
            </View>
            <Text style={s.welcomeText}>Welcome back</Text>
            <Text style={s.subText}>Sign in to continue your learning journey</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInUp.delay(150).duration(400)} style={s.formSection}>
            <InputField
              label="Email Address"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.email}
              iconName="mail-outline"
            />

            <InputField
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              iconName="lock-closed-outline"
              suffix={showPassword ? 'eye-outline' : 'eye-off-outline'}
              onSuffixPress={() => setShowPassword(!showPassword)}
            />

            <View style={s.rememberRow}>
              <Text style={s.rememberLabel}>Remember me</Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={rememberMe ? colors.accent : colors.surface}
              />
            </View>

            <TouchableOpacity style={s.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={s.signInBtn}
            />
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInUp.delay(300).duration(300)} style={s.footer}>
            <Text style={s.footerLabel}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={s.footerLink}>Join now</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    flex: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: SPACING.xl,
      justifyContent: 'center',
      paddingVertical: 60,
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING['4xl'],
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: RADIUS.xl,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.xl,
      ...SHADOW.md,
    },
    welcomeText: {
      ...FONTS.h1,
      fontSize: 28,
      color: colors.textPrimary,
    },
    subText: {
      ...FONTS.body,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    formSection: {
      width: '100%',
    },
    rememberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    rememberLabel: {
      ...FONTS.body,
      color: colors.textSecondary,
    },
    forgotBtn: {
      alignSelf: 'flex-end',
      marginBottom: SPACING.xl,
    },
    forgotText: {
      ...FONTS.caption,
      color: colors.accent,
      fontWeight: '600',
    },
    signInBtn: {
      marginTop: SPACING.md,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: SPACING['4xl'],
    },
    footerLabel: {
      ...FONTS.body,
      color: colors.textSecondary,
    },
    footerLink: {
      ...FONTS.bodyBold,
      color: colors.accent,
    },
  });
}
