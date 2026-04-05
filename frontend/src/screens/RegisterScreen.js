import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
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
    if (!name.trim()) newErrors.name = 'Full name is required';
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      await register(name, email, password);
      showToast('Account created successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>CF</Text>
          </View>
        </View>

        <Text style={styles.title}>Create Account 🚀</Text>
        <Text style={styles.subtitle}>Join thousands of learners showcasing their skills.</Text>

        <InputField
          label="Full Name"
          placeholder="John Doe"
          value={name}
          onChangeText={(t) => { setName(t); clearError('name'); }}
          autoCapitalize="words"
          error={errors.name}
        />

        <InputField
          label="Email Address"
          placeholder="name@example.com"
          value={email}
          onChangeText={(t) => { setEmail(t); clearError('email'); }}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />

        <InputField
          label="Password"
          placeholder="Min 6 characters"
          value={password}
          onChangeText={(t) => { setPassword(t); clearError('password'); }}
          secureTextEntry
          error={errors.password}
        />

        <PrimaryButton title="Register" onPress={handleRegister} loading={loading} variant="secondary" style={{ marginTop: SPACING.sm }} />

        {isWakingUp && (
          <Text style={styles.wakingText}>📍 Server waking up... please wait</Text>
        )}

        <PrimaryButton
          title="Already have an account? Login"
          onPress={() => navigation.goBack()}
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
  brandBlock: { alignItems: 'center', marginBottom: SPACING.xxl },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    ...SHADOW.md,
  },
  logoText: { color: COLORS.white, fontSize: 24, fontWeight: '900' },
  title: { ...FONTS.h1, marginBottom: SPACING.sm },
  subtitle: { ...FONTS.caption, fontSize: 16, marginBottom: SPACING.xxl },
  errorBox: { backgroundColor: COLORS.dangerLight, padding: SPACING.md, borderRadius: RADIUS.sm, marginBottom: SPACING.lg },
  errorText: { color: COLORS.danger, fontWeight: '600', fontSize: 14 },
  wakingText: {
    textAlign: 'center',
    color: COLORS.secondary,
    fontWeight: '700',
    marginTop: SPACING.md,
    fontSize: 13,
  },
});
