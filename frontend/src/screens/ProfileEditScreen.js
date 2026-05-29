import React, { useContext, useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, FONTS, RADIUS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { showToast } from '../components/Toast';

export default function ProfileEditScreen({ navigation }) {
  const { user, updateProfile, refreshUser } = useContext(AuthContext);
  const { colors, isDark } = useAppTheme();
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setHeadline(user.headline || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setSkills(Array.isArray(user.skills) ? user.skills.join(', ') : '');
    setWebsite(user.website || '');
    setLinkedinUrl(user.linkedinUrl || '');
    setGithubUrl(user.githubUrl || '');
    setProfilePicture(user.profilePicture || '');
  }, [user]);

  const save = async () => {
    if (!name.trim()) {
      showToast({ message: 'Name is required', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const skillsArr = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await updateProfile({
        name: name.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        location: location.trim(),
        skills: skillsArr,
        website: website.trim(),
        linkedinUrl: linkedinUrl.trim(),
        githubUrl: githubUrl.trim(),
        profilePicture: profilePicture.trim(),
      });
      await refreshUser();
      showToast({ message: 'Profile saved', type: 'success' });
      navigation.goBack();
    } catch (e) {
      showToast({
        message: e.response?.data?.message || 'Could not save profile',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const picUri = profilePicture?.trim();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {picUri ? (
            <View style={[styles.avatarPreview, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
              <Image source={{ uri: picUri }} style={styles.avatarImg} />
            </View>
          ) : (
            <View style={[styles.avatarPlaceholder, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
              <Ionicons name="person-outline" size={40} color={colors.textMuted} />
            </View>
          )}

          <InputField
            label="Profile picture URL"
            placeholder="https://… (public image link)"
            value={profilePicture}
            onChangeText={setProfilePicture}
            autoCapitalize="none"
          />

          <InputField label="Display name" value={name} onChangeText={setName} />
          <InputField
            label="Headline"
            placeholder="e.g. Senior engineer · Learning in public"
            value={headline}
            onChangeText={setHeadline}
          />
          <InputField label="Bio" value={bio} onChangeText={setBio} multiline style={{ minHeight: 100 }} />
          <InputField label="Location" placeholder="City, Country" value={location} onChangeText={setLocation} />
          <InputField
            label="Skills (comma-separated)"
            placeholder="TypeScript, Leadership, System design"
            value={skills}
            onChangeText={setSkills}
          />
          <InputField label="Website" placeholder="https://…" value={website} onChangeText={setWebsite} autoCapitalize="none" />
          <InputField label="LinkedIn URL" value={linkedinUrl} onChangeText={setLinkedinUrl} autoCapitalize="none" />
          <InputField label="GitHub URL" value={githubUrl} onChangeText={setGithubUrl} autoCapitalize="none" />

          <PrimaryButton title="Save changes" onPress={save} loading={loading} fullWidth style={{ marginTop: SPACING.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...FONTS.h3, fontWeight: '700' },
  scroll: { padding: SPACING.xl, paddingBottom: 120 },
  avatarPreview: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
});
