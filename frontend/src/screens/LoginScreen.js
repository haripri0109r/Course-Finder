import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { showToast } from '../components/Toast';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      await login(email, password);
      showToast({ message: 'Welcome back!', type: 'success' });
    } catch (err) {
      showToast({ message: 'Invalid credentials', type: 'error' });
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
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🎓</Text>
            </View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subText}>Sign in to continue your learning journey.</Text>
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

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot password?</Text>
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
            <Text style={styles.footerLabel}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Join now</Text>
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
    backgroundColor: COLORS.surface 
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
    backgroundColor: COLORS.primary, 
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
    color: COLORS.textPrimary 
  },
  subText: { 
    ...FONTS.body, 
    color: COLORS.textSecondary, 
    marginTop: 8,
    textAlign: 'center',
  },
  formSection: { 
    width: '100%',
  },
  forgotBtn: { 
    alignSelf: 'flex-end', 
    marginBottom: SPACING.xl 
  },
  forgotText: { 
    ...FONTS.tiny, 
    color: COLORS.accent,
    fontWeight: '600' 
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
    color: COLORS.textSecondary 
  },
  footerLink: { 
    ...FONTS.bodyBold, 
    color: COLORS.accent 
  },
});
