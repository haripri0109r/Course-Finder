import React, { useContext, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAppTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import PrimaryButton from '../components/PrimaryButton';
import { showToast } from '../components/Toast';

const PREFS_KEY = '@cf_settings_prefs_v1';

const DEFAULT_PREFS = {
  profileVisibility: true,
  publicPortfolio: true,
  emailPrefs: true,
  connectedAccounts: false,

  notificationsEnabled: true,
  autoplayMedia: true,
  downloadsWifiOnly: true,
  language: 'English',

  reminders: true,
  streakAlerts: true,
  celebrations: true,
  achievementNotifs: true,
};

function createStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      ...SHADOW.xs,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      ...FONTS.h2,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerSub: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 6,
    },

    content: { padding: SPACING.xl, paddingBottom: 120 },

    sectionLabel: {
      ...FONTS.tiny,
      color: colors.textMuted,
      letterSpacing: 1.2,
      marginBottom: SPACING.sm,
      marginTop: SPACING.xl,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      ...SHADOW.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    rowIcon: { marginRight: SPACING.md },
    rowText: { flex: 1 },
    rowTitle: { ...FONTS.bodyBold, color: colors.textPrimary },
    rowSub: { ...FONTS.small, color: colors.textSecondary, marginTop: 2 },
    rowRight: { marginLeft: SPACING.md, flexDirection: 'row', alignItems: 'center' },
    divider: { height: 1, backgroundColor: colors.border },

    dangerRowTitle: { ...FONTS.bodyBold, color: colors.danger },
    dangerRowSub: { ...FONTS.small, color: colors.textSecondary, marginTop: 2 },

    versionPill: {
      alignSelf: 'flex-start',
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    versionText: { ...FONTS.captionBold, color: colors.textSecondary },

    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: SPACING.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
  });
}

function Row({ colors, icon, title, subtitle, right, onPress, destructive = false, showChevron = true }) {
  const TitleComp = destructive ? Text : Text;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.85 : 1} disabled={!onPress}>
      <View style={stylesShared.row}>
        <View style={stylesShared.rowLeft}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={destructive ? colors.danger : colors.textSecondary}
              style={stylesShared.rowIcon}
            />
          ) : null}
          <View style={stylesShared.rowText}>
            <Text style={destructive ? stylesShared.dangerRowTitle : stylesShared.rowTitle}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={destructive ? stylesShared.dangerRowSub : stylesShared.rowSub}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={stylesShared.rowRight}>
          {right}
          {showChevron ? (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

let stylesShared;

export default function SettingsScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  stylesShared = styles;

  const { logout } = useContext(AuthContext);
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
    return () => {
      cancelled = true;
    };
  }, []);

  const setPref = async (key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const comingSoon = (label) => showToast({ message: `${label} — coming soon`, type: 'info' });

  const confirmLogout = () => {
    Alert.alert('Logout', 'Ready to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'Account deletion requires contacting support. This ensures your data is handled securely.',
      [
        { text: 'OK', style: 'default' },
      ]
    );
  };

  const appVersion =
    Constants?.expoConfig?.version ||
    Constants?.manifest2?.extra?.expoClient?.version ||
    '1.0.0';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerIconBtn}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>Fine-tune privacy, preferences, and learning reminders.</Text>
        <View style={styles.versionPill}>
          <Text style={styles.versionText}>Version {appVersion}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <Row
            colors={colors}
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
            colors={colors}
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
            colors={colors}
            icon="key-outline"
            title="Change password"
            subtitle="Update your password"
            onPress={() => Alert.alert('Change password', 'Password reset is available from the login screen via "Forgot password".', [{ text: 'OK' }])}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
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
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="link-outline"
            title="Connected accounts"
            subtitle="Google, GitHub, LinkedIn"
            onPress={() => comingSoon('Connected accounts')}
          />
        </View>

        <Text style={styles.sectionLabel}>APP PREFERENCES</Text>
        <View style={styles.card}>
          <Row
            colors={colors}
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
            colors={colors}
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
            colors={colors}
            icon="language-outline"
            title="Language"
            subtitle={prefs.language}
            onPress={() => comingSoon('Language')}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="play-outline"
            title="Autoplay media"
            subtitle="Auto-play videos when available"
            right={
              <Switch
                value={prefs.autoplayMedia}
                onValueChange={(v) => setPref('autoplayMedia', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.autoplayMedia ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="download-outline"
            title="Downloads"
            subtitle="Wi‑Fi only"
            right={
              <Switch
                value={prefs.downloadsWifiOnly}
                onValueChange={(v) => setPref('downloadsWifiOnly', v)}
                trackColor={{ false: colors.border, true: colors.accentLight }}
                thumbColor={prefs.downloadsWifiOnly ? colors.accent : colors.surface}
              />
            }
            showChevron={false}
          />
        </View>

        <Text style={styles.sectionLabel}>LEARNING</Text>
        <View style={styles.card}>
          <Row
            colors={colors}
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
            colors={colors}
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
            colors={colors}
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
            colors={colors}
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

        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <View style={styles.card}>
          <Row
            colors={colors}
            icon="shield-checkmark-outline"
            title="Privacy settings"
            subtitle="Control what you share"
            onPress={() => comingSoon('Privacy settings')}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="lock-closed-outline"
            title="Session management"
            subtitle="Manage active sessions"
            onPress={() => comingSoon('Session management')}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="finger-print-outline"
            title="Security"
            subtitle="Device & sign-in protections"
            onPress={() => comingSoon('Security')}
          />
        </View>

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        <View style={styles.card}>
          <Row
            colors={colors}
            icon="help-circle-outline"
            title="Help center"
            subtitle="FAQs and guides"
            onPress={() => comingSoon('Help center')}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="chatbubbles-outline"
            title="Contact support"
            subtitle="Get help from the team"
            onPress={() => comingSoon('Contact support')}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="megaphone-outline"
            title="Feedback"
            subtitle="Suggest improvements"
            onPress={() => comingSoon('Feedback')}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="bug-outline"
            title="Report an issue"
            subtitle="Crash or bug report"
            onPress={() => comingSoon('Report an issue')}
          />
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Row colors={colors} icon="document-text-outline" title="Privacy policy" onPress={() => comingSoon('Privacy policy')} />
          <View style={styles.divider} />
          <Row colors={colors} icon="receipt-outline" title="Terms" onPress={() => comingSoon('Terms')} />
          <View style={styles.divider} />
          <Row colors={colors} icon="albums-outline" title="Licenses" onPress={() => comingSoon('Licenses')} />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT ACTIONS</Text>
        <View style={styles.card}>
          <Row
            colors={colors}
            icon="log-out-outline"
            title="Logout"
            subtitle="Sign out from this device"
            onPress={confirmLogout}
            showChevron={false}
          />
          <View style={styles.divider} />
          <Row
            colors={colors}
            icon="trash-outline"
            title="Delete account"
            subtitle="Irreversible"
            onPress={confirmDeleteAccount}
            destructive
            showChevron={false}
          />
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Done"
          onPress={() => navigation.goBack()}
          fullWidth
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
}

