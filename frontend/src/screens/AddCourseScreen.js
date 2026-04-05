import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../services/api';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { showToast } from '../components/Toast';

const PLATFORMS = ['Udemy', 'Coursera', 'YouTube', 'Other'];

export default function AddCourseScreen() {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [rating, setRating] = useState('');
  const [review, setReview] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!platform) newErrors.platform = 'Please select a platform';
    
    if (!url) newErrors.url = 'Course URL is required';
    else if (!url.startsWith('http')) newErrors.url = 'Invalid URL (must start with http/https)';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      await api.post('/api/completed', {
        title, platform, url,
        rating: rating ? Number(rating) : undefined,
        review,
      });
      showToast('Course logged successfully!', 'success');
      setTitle(''); setPlatform(''); setUrl(''); setRating(''); setReview('');
      setErrors({});
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add course', 'error');
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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.headline}>Log a Course 📝</Text>
        <Text style={styles.subline}>Completed something awesome? Record it here.</Text>

        <InputField
          label="Course Title *"
          placeholder="e.g. Advanced React Patterns"
          value={title}
          onChangeText={(t) => { setTitle(t); clearError('title'); }}
          error={errors.title}
        />

        {/* Platform Selector */}
        <Text style={styles.label}>Platform *</Text>
        <View style={styles.platformRow}>
          {PLATFORMS.map((p) => (
            <PrimaryButton
              key={p}
              title={p}
              variant={platform === p ? 'primary' : 'outline'}
              onPress={() => { setPlatform(p); clearError('platform'); }}
              style={styles.platformChip}
              textStyle={{ fontSize: 13 }}
            />
          ))}
        </View>
        {errors.platform && <Text style={styles.errorTextSmall}>{errors.platform}</Text>}

        <InputField
          label="Course URL *"
          placeholder="https://..."
          value={url}
          onChangeText={(t) => { setUrl(t); clearError('url'); }}
          autoCapitalize="none"
          keyboardType="url"
          error={errors.url}
        />

        {/* Star Rating Selector */}
        <Text style={styles.label}>Your Rating</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Text
              key={n}
              style={[styles.star, Number(rating) >= n && styles.starActive]}
              onPress={() => setRating(String(n))}
            >
              ★
            </Text>
          ))}
        </View>

        <InputField label="Review (optional)" placeholder="What did you like about this course?" value={review} onChangeText={setReview} multiline />

        <PrimaryButton title="Submit Course" onPress={handleSubmit} loading={loading} style={{ marginTop: SPACING.sm }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  headline: { ...FONTS.h1, paddingTop: 56, marginBottom: SPACING.xs },
  subline: { ...FONTS.caption, fontSize: 15, marginBottom: SPACING.xxl },
  label: { ...FONTS.caption, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.sm, marginLeft: SPACING.xs },

  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
  },
  platformChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    minHeight: 40,
    borderRadius: RADIUS.pill,
  },

  ratingRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
    marginLeft: SPACING.xs,
  },
  star: {
    fontSize: 36,
    color: COLORS.border,
    marginRight: SPACING.sm,
  },
  starActive: {
    color: '#FBBF24',
  },
});
