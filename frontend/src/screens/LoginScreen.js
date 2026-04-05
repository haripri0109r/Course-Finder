import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { showToast } from '../components/Toast';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);

  React.useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setIsWakingUp(true), 5000);
    } else {
      setIsWakingUp(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';

    if (!password) newErrors.password = 'Password is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      await login(email, password);
      showToast('Login successful', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Branding */}
        <View style={styles.brandBlock}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>CF</Text>
          </View>
          <Text style={styles.brandName}>CourseFinder</Text>
        </View>

        <Text style={styles.title}>Welcome back 👋</Text>
        <Text style={styles.subtitle}>Sign in to continue your learning journey.</Text>

        <InputField
          label="Email Address"
          placeholder="name@example.com"
          value={email}
          onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: null }); }}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />

        <InputField
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: null }); }}
          secureTextEntry
          error={errors.password}
        />

        <PrimaryButton title="Sign In" onPress={handleLogin} loading={loading} style={{ marginTop: SPACING.sm }} />

        {isWakingUp && (
          <Text style={styles.wakingText}>📍 Server waking up... please wait</Text>
        )}

        <PrimaryButton
          title="Create an Account"
          onPress={() => navigation.navigate('Register')}
          variant="outline"
          style={{ marginTop: SPACING.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xxl },
  brandBlock: { alignItems: 'center', marginBottom: SPACING.xxxl },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.lg,
  },
  logoText: { color: COLORS.white, fontSize: 24, fontWeight: '900' },
  brandName: { ...FONTS.h3, color: COLORS.primary, letterSpacing: 1 },
  title: { ...FONTS.h1, marginBottom: SPACING.sm },
  subtitle: { ...FONTS.caption, fontSize: 16, marginBottom: SPACING.xxl },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.lg,
  },
  errorText: { color: COLORS.danger, fontWeight: '600', fontSize: 14 },
  wakingText: {
    textAlign: 'center',
    color: COLORS.secondary,
    fontWeight: '700',
    marginTop: SPACING.md,
    fontSize: 13,
  },
});
