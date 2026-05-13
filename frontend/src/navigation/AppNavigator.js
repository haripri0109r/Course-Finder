import React, { useContext, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, FONTS, LAYOUT } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import FloatingTabBar from '../components/FloatingTabBar';
import { ONBOARDING_STORAGE_KEY } from '../constants/onboarding';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import AddCourseScreen from '../screens/AddCourseScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import SavedScreen from '../screens/SavedScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { AuthContext } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  
  // Global bottom padding for all tab screens to account for the floating tab bar.
  // Calculation: Max of (safe area inset or min spacing) + tab bar height + floating offset + breathing room.
  const bottomOffset = Math.max(insets.bottom, SPACING.sm) + LAYOUT.tabBarHeight + LAYOUT.floatingNavBottom + 16;

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      sceneContainerStyle={{
        backgroundColor: colors.background,
        paddingBottom: bottomOffset,
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 98 : 90,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarAccessibilityLabel: 'Explore courses' }}
      />
      <Tab.Screen
        name="Add"
        component={AddCourseScreen}
        options={{ tabBarAccessibilityLabel: 'Add course completion' }}
      />
      <Tab.Screen name="Inbox" component={NotificationScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function LoadingShell() {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[FONTS.body, { color: colors.textSecondary, marginTop: 12 }]}>Loading…</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);
  const isAuthenticated = !!user;
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!cancelled) {
          setOnboardingComplete(v === 'true');
          setOnboardingChecked(true);
        }
      } catch {
        if (!cancelled) {
          setOnboardingComplete(false);
          setOnboardingChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || !onboardingChecked) {
    return <LoadingShell />;
  }

  if (!onboardingComplete) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setOnboardingComplete(true);
        }}
      />
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="Saved" component={SavedScreen} />
          <Stack.Screen name="UserProfile" component={ProfileScreen} />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
