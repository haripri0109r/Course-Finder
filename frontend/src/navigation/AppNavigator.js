import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, Platform } from 'react-native';
import { FONTS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import FloatingTabBar from '../components/FloatingTabBar';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import AddCourseScreen from '../screens/AddCourseScreen';
import NotificationScreen from '../screens/NotificationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import CourseViewerScreen from '../screens/CourseViewerScreen';
import SavedScreen from '../screens/SavedScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { AuthContext } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
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
      <Text style={[FONTS.body, { color: colors.textSecondary }]}>Loading...</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);
  const isAuthenticated = !!user;

  if (isLoading) {
    return <LoadingShell />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="CourseViewer" component={CourseViewerScreen} />
          <Stack.Screen name="Saved" component={SavedScreen} />
          <Stack.Screen name="UserProfile" component={ProfileScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
