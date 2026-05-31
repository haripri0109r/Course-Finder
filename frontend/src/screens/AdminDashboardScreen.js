import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { SPACING, FONTS, RADIUS } from '../utils/theme';
import api from '../utils/api';

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { colors, isDark } = useAppTheme();
  
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      fetchAnalytics();
    } else {
      setLoading(false); // Moderators just see queue links, no analytics
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get('/admin/analytics');
      setAnalytics(data.data);
    } catch (e) {
      console.warn('Failed to fetch analytics', e);
    } finally {
      setLoading(false);
    }
  };

  const isModeratorOrHigher = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);
  const isAdminOrHigher = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);

  if (!isModeratorOrHigher) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>Access Denied</Text>
      </View>
    );
  }

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Administration</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {isAdminOrHigher && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
            {loading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : analytics ? (
              <View style={styles.statsGrid}>
                <StatCard title="Total Users" value={analytics.totalUsers} icon="people" color="#3B82F6" />
                <StatCard title="Active Users" value={analytics.activeUsers} icon="pulse" color="#10B981" />
                <StatCard title="Total Posts" value={analytics.totalPosts} icon="document-text" color="#8B5CF6" />
                <StatCard title="Open Reports" value={analytics.openReports} icon="warning" color="#EF4444" />
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary }}>Failed to load analytics</Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Management</Text>
          
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => Alert.alert('Moderation Queue', 'Queue UI implementation pending')}>
            <View style={[styles.menuIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="shield-checkmark" size={22} color="#EF4444" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Moderation Queue</Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Review user and content reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {isAdminOrHigher && (
            <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.borderLight }]} onPress={() => Alert.alert('Users', 'User management UI pending')}>
              <View style={[styles.menuIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="people" size={22} color="#3B82F6" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Users Directory</Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>Manage roles and suspensions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: { ...FONTS.h3 },
  scroll: { padding: SPACING.md },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...FONTS.h4, marginBottom: SPACING.md },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    width: '48%',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: { ...FONTS.h3 },
  statTitle: { ...FONTS.small, marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuTextWrap: { flex: 1 },
  menuTitle: { ...FONTS.bodyBold },
  menuSub: { ...FONTS.small, marginTop: 2 },
});
