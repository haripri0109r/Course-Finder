import React, { useContext, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAppTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';
import { showToast } from '../components/Toast';
import Avatar from '../components/Avatar';

const PREFS_KEY = '@cf_settings_prefs_v1';

const DEFAULT_PREFS = {
  profileVisibility: true,
  publicPortfolio: true,
  emailPrefs: true,
  notificationsEnabled: true,
  autoplayMedia: true,
  downloadsWifiOnly: true,
  language: 'English',
  reminders: true,
  streakAlerts: true,
  celebrations: true,
  achievementNotifs: true,
};

// ─── Row Component ──────────────────────────────────────────────────
function Row({ colors, styles, icon, title, subtitle, right, onPress, destructive = false, showChevron = true }) {
  return (
    <TouchableOpacity
      onPress={() => {
        if (onPress) {
          triggerHaptic('selection');
          onPress();
        }
      }}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      style={styles.row}
    >
      <View style={styles.rowLeft}>
        {icon ? (
          <View style={[styles.rowIconWrap, destructive && { backgroundColor: colors.dangerSoft }]}>
            <Ionicons
              name={icon}
              size={18}
              color={destructive ? colors.danger : colors.textSecondary}
            />
          </View>
        ) : null}
        <View style={styles.rowText}>
          <Text style={destructive ? styles.dangerRowTitle : styles.rowTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={destructive ? styles.dangerRowSub : styles.rowSub}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {right}
        {showChevron && (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── SettingsScreen ─────────────────────────────────────────────────
export default function SettingsScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets), [colors, insets]);
  const { user: currentUser, logout } = useContext(AuthContext);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!cancelled && parsed && typeof parsed === 'object') {
          setPrefs((p) => ({ ...p, ...parsed }));
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const setPref = async (key, value) => {
    triggerHaptic('selection');
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const confirmLogout = () => {
    triggerHaptic('impactMedium');
    Alert.alert('Logout', 'Ready to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const confirmDeleteAccount = () => {
    triggerHaptic('notificationError');
    Alert.alert('Delete account', 'Account deletion requires contacting support.', [
      { text: 'OK', style: 'default' },
    ]);
  };

  const appVersion =
    Constants?.expoConfig?.version ||
    Constants?.manifest2?.extra?.expoClient?.version ||
    '1.0.0';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('impactLight');
              navigation.goBack();
            }}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 48 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {/* User Card */}
        <TouchableOpacity
          style={styles.userCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatarWrap}>
            <Avatar name={currentUser?.name} uri={currentUser?.profilePicture} size="lg" />
          </View>
          <View style={styles.userCardInfo}>
            <Text style={styles.userCardName}>{currentUser?.name || 'Learner'}</Text>
            <Text style={styles.userCardEmail}>{currentUser?.email || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {currentUser?.role && ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && (
          <>
            <Text style={styles.sectionLabel}>ADMINISTRATION</Text>
            <View style={styles.card}>
              <Row
                colors={colors} styles={styles}
                icon="shield-checkmark-outline"
                title="Admin Dashboard"
                subtitle="Moderation and management"
                onPress={() => navigation.navigate('AdminDashboard')}
              />
            </View>
          </>
        )}

        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <Row
            colors={colors} styles={styles}
            icon="eye-outline"
            title="Profile visibility"
            subtitle="Show your profile to other learners"
            right={
              <Switch
                value={prefs.profileVisibility}
                onValueChange={(v) => setPref('profileVisibility', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.profileVisibility ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="briefcase-outline"
            title="Public portfolio"
            subtitle="Allow your course logs to be shared publicly"
            right={
              <Switch
                value={prefs.publicPortfolio}
                onValueChange={(v) => setPref('publicPortfolio', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.publicPortfolio ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="key-outline"
            title="Change password"
            subtitle="Update your password"
            onPress={() => Alert.alert('Change password', 'Password reset is available from the login screen via "Forgot password".')}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="mail-outline"
            title="Email preferences"
            subtitle="Product updates and newsletters"
            right={
              <Switch
                value={prefs.emailPrefs}
                onValueChange={(v) => setPref('emailPrefs', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.emailPrefs ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
        </View>

        {/* App Preferences */}
        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.card}>
          <Row
            colors={colors} styles={styles}
            icon={isDark ? 'moon-outline' : 'sunny-outline'}
            title="Dark mode"
            subtitle={isDark ? 'Enabled' : 'Disabled'}
            right={
              <Switch
                value={isDark}
                onValueChange={() => toggleTheme()}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={isDark ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="notifications-outline"
            title="Notifications"
            subtitle="Push notifications for activity"
            right={
              <Switch
                value={prefs.notificationsEnabled}
                onValueChange={(v) => setPref('notificationsEnabled', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.notificationsEnabled ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="language-outline"
            title="Language"
            subtitle={prefs.language}
            onPress={() => showToast({ message: 'Language — coming soon', type: 'info' })}
          />
        </View>

        {/* Learning */}
        <Text style={styles.sectionLabel}>LEARNING</Text>
        <View style={styles.card}>
          <Row
            colors={colors} styles={styles}
            icon="alarm-outline"
            title="Reminders"
            subtitle="Daily nudges to keep your streak alive"
            right={
              <Switch
                value={prefs.reminders}
                onValueChange={(v) => setPref('reminders', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.reminders ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="flame-outline"
            title="Streak alerts"
            subtitle="Celebrate streak milestones"
            right={
              <Switch
                value={prefs.streakAlerts}
                onValueChange={(v) => setPref('streakAlerts', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.streakAlerts ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="sparkles-outline"
            title="Celebrations"
            subtitle="Animations when you ship a win"
            right={
              <Switch
                value={prefs.celebrations}
                onValueChange={(v) => setPref('celebrations', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.celebrations ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="ribbon-outline"
            title="Achievement notifications"
            subtitle="Notify when you unlock badges"
            right={
              <Switch
                value={prefs.achievementNotifs}
                onValueChange={(v) => setPref('achievementNotifs', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.achievementNotifs ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.card}>
          <Row
            colors={colors} styles={styles}
            icon="help-circle-outline"
            title="Help center"
            subtitle="FAQs and guides"
            onPress={() => showToast({ message: 'Help center — coming soon', type: 'info' })}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="chatbubbles-outline"
            title="Contact support"
            subtitle="Get help from the team"
            onPress={() => showToast({ message: 'Contact support — coming soon', type: 'info' })}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="megaphone-outline"
            title="Feedback"
            subtitle="Suggest improvements"
            onPress={() => showToast({ message: 'Feedback — coming soon', type: 'info' })}
          />
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Row colors={colors} styles={styles} icon="document-text-outline" title="Privacy policy" onPress={() => {}} />
          <View style={styles.divider} />
          <Row colors={colors} styles={styles} icon="receipt-outline" title="Terms of service" onPress={() => {}} />
          <View style={styles.divider} />
          <Row colors={colors} styles={styles} icon="albums-outline" title="Licenses" onPress={() => {}} />
        </View>

        {/* Account Actions */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <Row
            colors={colors} styles={styles}
            icon="log-out-outline"
            title="Logout"
            subtitle="Sign out from this device"
            onPress={confirmLogout}
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors} styles={styles}
            icon="trash-outline"
            title="Delete account"
            subtitle="Irreversible"
            onPress={confirmDeleteAccount}
            destructive
            showChevron={false}
          />
        </View>

        {/* Version */}
        <View style={styles.versionWrap}>
          <Text style={styles.versionText}>Version {appVersion}</Text>
        </View>

        <View style={{ height: SPACING['4xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
function createStyles(colors, insets) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerIconBtn: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -8,
    },
    headerTitle: {
      ...FONTS.h2,
      color: colors.textPrimary,
    },

    // Scroll content
    scrollContent: {
      paddingHorizontal: SPACING.xl,
      paddingBottom: Math.max(insets.bottom, SPACING.xl) + SPACING.xl,
    },

    // User card
    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: SPACING.lg,
      marginBottom: SPACING.xl,
    },
    avatarWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: colors.surfaceSubtle,
    },
    userCardInfo: {
      flex: 1,
      marginLeft: SPACING.md,
    },
    userCardName: {
      ...FONTS.bodyBold,
      color: colors.textPrimary,
    },
    userCardEmail: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Section label
    sectionLabel: {
      ...FONTS.tiny,
      color: colors.textMuted,
      letterSpacing: 1.2,
      marginBottom: SPACING.sm,
      marginTop: SPACING.lg,
    },

    // Card
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
    },

    // Row
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      minHeight: 56,
      paddingVertical: SPACING.sm,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rowIconWrap: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
      backgroundColor: colors.surfaceSubtle,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      ...FONTS.bodyMedium,
      color: colors.textPrimary,
    },
    rowSub: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 2,
    },
    rowRight: {
      marginLeft: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dangerRowTitle: {
      ...FONTS.bodyMedium,
      color: colors.danger,
    },
    dangerRowSub: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: SPACING.lg + 32 + SPACING.md,
    },

    // Version
    versionWrap: {
      alignItems: 'center',
      marginTop: SPACING.xl,
    },
    versionText: {
      ...FONTS.small,
      color: colors.textMuted,
    },
  });
}
