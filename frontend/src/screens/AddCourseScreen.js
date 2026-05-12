import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import SectionHeader from '../components/SectionHeader';
import Chip from '../components/Chip';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../components/Toast';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW, LAYOUT } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

const PLATFORMS = ['Udemy', 'Coursera', 'YouTube', 'Other'];
const STEPS = ['Content', 'Details', 'Feedback', 'Verification'];

export default function AddCourseScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Form State
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [providerBadge, setProviderBadge] = useState('');
  const [publisher, setPublisher] = useState('');
  const [logo, setLogo] = useState('');
  const [rating, setRating] = useState('');
  const [review, setReview] = useState('');
  const [image, setImage] = useState('');
  const [duration, setDuration] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [certificatePublicId, setCertificatePublicId] = useState('');
  const [description, setDescription] = useState('');
  const [learnings, setLearnings] = useState('');
  const [postTags, setPostTags] = useState('');
  const [courseThumbnail, setCourseThumbnail] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  
  // Internal State
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const [metadataManualMode, setMetadataManualMode] = useState(false);
  const [metadataFetched, setMetadataFetched] = useState(false);
  const [generatedFallback, setGeneratedFallback] = useState(false);
  const [errors, setErrors] = useState({});

  const nextStep = () => {
    if (currentStep === 0 && !url.trim()) {
      setErrors({ url: 'Course URL is required' });
      return;
    }
    if (currentStep === 1 && (!title.trim() || !platform)) {
      setErrors({ title: !title.trim() ? 'Title is required' : null, platform: !platform ? 'Select platform' : null });
      return;
    }
    setErrors({});
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const isValidHttpUrl = (value = '') => /^https?:\/\//i.test(value.trim());

  const mapPlatformToDisplay = (platformValue, badgeValue) => {
    const candidate = (badgeValue || platformValue || '').toLowerCase();
    const matched = PLATFORMS.find((p) => p.toLowerCase() === candidate);
    if (matched) return matched;
    if (candidate.includes('youtube')) return 'YouTube';
    if (candidate.includes('udemy')) return 'Udemy';
    if (candidate.includes('coursera')) return 'Coursera';
    return 'Other';
  };

  // Metadata Fetch
  const fetchMetadata = async () => {
    if (!isValidHttpUrl(url)) {
      setMetadataError('Enter a valid URL to fetch details.');
      return;
    }

    try {
      setIsFetchingMetadata(true);
      setMetadataError('');
      setMetadataManualMode(false);
      setGeneratedFallback(false);
      const res = await api.fetchMetadata(url);
      const metadata = res.data?.metadata || res.data?.data || null;

      if (res.data?.success && metadata) {
        const { title: t, thumbnail, author: a, duration: d, platform: p, providerBadge: b, description: desc, publisher: pub, logo: lg, generatedFallback: isGenerated } = metadata;
        if (t) setTitle(t);
        if (thumbnail) setImage(thumbnail);
        else setImage(null); // Explicitly set null for safety
        if (a) setAuthor(a);
        if (d) setDuration(d);
        if (desc) setDescription(desc);
        if (pub) setPublisher(pub);
        if (lg) setLogo(lg);
        setProviderBadge(b || '');
        setPlatform(mapPlatformToDisplay(p, b));
        setGeneratedFallback(isGenerated || false);
        setMetadataFetched(true);
        showToast({ message: 'Course details fetched.', type: 'success' });
        return;
      }

      if (res.data?.manualEntry) {
        setMetadataManualMode(true);
        setMetadataFetched(false);
        if (res.data?.reason === 'provider_blocked') {
          setMetadataError('This provider blocks automatic metadata extraction. Please continue with manual entry.');
        } else if (res.data?.reason === 'invalid_udemy_course') {
          setMetadataError('This link does not provide usable course details. Please enter details manually.');
        } else if (res.data?.reason === 'low_quality_metadata') {
          setMetadataError('This link does not provide usable course details. Please enter them manually.');
        } else {
          setMetadataError('Automatic extraction unavailable for this link.');
        }
        return;
      }

      setMetadataError('Automatic extraction unavailable for this link.');
    } catch (e) {
      const timedOut = e?.code === 'ECONNABORTED';
      setMetadataFetched(false);
      setMetadataError(timedOut ? 'Automatic extraction unavailable for this link.' : 'Could not fetch metadata. Please fill manually.');
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  useEffect(() => {
    setMetadataError('');
    setMetadataManualMode(false);
    setMetadataFetched(false);
    setGeneratedFallback(false);
  }, [url]);

  const handlePickThumbnail = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled && result.assets?.[0]) {
        setThumbnailFile(result.assets[0]);
        showToast({ message: 'Thumbnail selected!', type: 'success' });
      }
    } catch (e) {
      showToast({ message: 'Thumbnail picker failed', type: 'error' });
    }
  };

  const handlePickCertificateFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
      if (!result.canceled && result.assets?.[0]) {
        setCertificateFile(result.assets[0]);
        showToast({ message: 'Certificate selected!', type: 'success' });
      }
    } catch (e) {
      showToast({ message: 'Certificate picker failed', type: 'error' });
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      formData.append('title', title);
      formData.append('platform', platform);
      formData.append('url', url);
      formData.append('image', courseThumbnail || image); // Priority to manual URL over fetched
      formData.append('duration', duration);
      formData.append('rating', rating);
      formData.append('review', review);
      formData.append('description', description);
      
      // Process and append arrays
      const learningsArr = learnings.split(',').map(i => i.trim()).filter(Boolean);
      learningsArr.forEach(l => formData.append('learnings[]', l));
      
      const tagsArr = postTags.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
      tagsArr.forEach(t => formData.append('tags[]', t));

      if (thumbnailFile) {
        formData.append('thumbnail', {
          uri: thumbnailFile.uri,
          name: thumbnailFile.name || 'thumbnail.jpg',
          type: thumbnailFile.mimeType || 'image/jpeg'
        });
      }

      if (certificateFile) {
        formData.append('certificate', {
          uri: certificateFile.uri,
          name: certificateFile.name || 'certificate.pdf',
          type: certificateFile.mimeType || 'application/pdf'
        });
      }

      await api.post('/completed', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast({ message: 'Course Shared Successfully! 🚀', type: 'success' });
      navigation.navigate('Home');
    } catch (e) {
      showToast({ message: 'Failed to share', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <View style={styles.indicatorContainer}>
      <View style={styles.stepIndicator}>
        {STEPS.map((step, idx) => (
          <View key={step} style={styles.stepWrapper}>
            <View style={[
              styles.stepDot, 
              idx <= currentStep && styles.stepDotActive, 
              idx < currentStep && styles.stepDotDone
            ]}>
              {idx < currentStep ? (
                <Text style={styles.stepCheck}>✓</Text>
              ) : (
                <Text style={[styles.stepNum, idx === currentStep && styles.stepNumActive]}>{idx + 1}</Text>
              )}
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[styles.stepLine, idx < currentStep && styles.stepLineActive]} />
            )}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>{STEPS[currentStep]}</Text>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Course Source" subtitle="Paste the URL to automatically sync course details" />
            <InputField
              label="Course URL"
              placeholder="https://..."
              value={url}
              onChangeText={setUrl}
              error={errors.url}
              icon="🔗"
            />

            <InputField
              label="Course Thumbnail URL (Optional)"
              placeholder="Paste image URL (e.g. https://...)"
              value={courseThumbnail}
              onChangeText={setCourseThumbnail}
              icon="🖼️"
              containerStyle={{ marginTop: SPACING.md }}
            />

            {isValidHttpUrl(url) && (
              <View style={styles.fetchActionRow}>
                <PrimaryButton
                  title="Fetch Details"
                  onPress={fetchMetadata}
                  loading={isFetchingMetadata}
                  size="sm"
                  style={styles.fetchBtn}
                />
              </View>
            )}

            {isFetchingMetadata && (
              <View style={styles.metadataSkeleton}>
                <Text style={styles.fetchText}>Fetching course details...</Text>
                <LoadingSkeleton height={120} radius={RADIUS.md} style={{ marginTop: SPACING.sm }} />
              </View>
            )}

            {!isFetchingMetadata && metadataError ? (
              <View style={styles.metadataAlert}>
                <Text style={styles.metadataAlertText}>{metadataError}</Text>
                {!metadataManualMode && (
                  <TouchableOpacity onPress={fetchMetadata} style={styles.retryInlineBtn}>
                    <Text style={styles.retryInlineText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {metadataFetched && !isFetchingMetadata && (
              <View style={styles.previewCard}>
                {(thumbnailFile?.uri || courseThumbnail || image) ? (
                  <Image source={{ uri: thumbnailFile?.uri || courseThumbnail || image }} style={styles.previewThumb} />
                ) : (
                  <View style={[styles.previewThumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surfaceSubtle }]}>
                    <Ionicons name="school-outline" size={48} color={COLORS.textMuted} />
                    <Text style={{ ...FONTS.tiny, color: COLORS.textMuted, marginTop: 8 }}>Preview not available</Text>
                  </View>
                )}
                <View style={styles.previewMeta}>
                  <Text style={styles.previewTitle} numberOfLines={2}>{title || 'Untitled Course'}</Text>
                    {!!author && <Text style={styles.previewSub}>{author}</Text>}
                    {!!publisher && <Text style={styles.previewSub}>{publisher}</Text>}
                    <Text style={styles.previewSub}>{duration || 'Duration not available'}</Text>
                  <View style={styles.previewBadgeRow}>
                    <Text style={styles.previewBadge}>{providerBadge || platform || 'Other'}</Text>
                    {generatedFallback && <Text style={[styles.previewBadge, { backgroundColor: '#F59E0B', color: COLORS.white, borderColor: '#F59E0B' }]}>Auto-generated from URL</Text>}
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Identify & Categorize" subtitle="Confirm the course details" />
            <InputField label="Title" value={title} onChangeText={setTitle} error={errors.title} />
            <Text style={styles.label}>Platform</Text>
            <View style={styles.platformRow}>
              {PLATFORMS.map(p => (
                <Chip key={p} label={p} selected={platform === p} onPress={() => setPlatform(p)} variant={platform === p ? 'filled' : 'soft'} />
              ))}
            </View>
            <InputField label="Estimated Duration" placeholder="e.g. 12 hours" value={duration} onChangeText={setDuration} icon="⌛" />
            <InputField label="Instructor / Author" placeholder="e.g. Andrew Ng" value={author} onChangeText={setAuthor} icon="👤" />
            <InputField label="Skills / Tags" placeholder="react, frontend, hooks" value={postTags} onChangeText={setPostTags} icon="🏷️" />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Your Experience" subtitle="Rate and share your thoughts" />
            <Text style={styles.label}>Overall Rating</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(String(n))} activeOpacity={0.7} style={styles.starBtn}>
                  <Text style={[styles.star, Number(rating) >= n && styles.starActive]}>
                    {Number(rating) >= n ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <InputField label="Key Learnings" placeholder="What were your top takeaways?" value={learnings} onChangeText={setLearnings} multiline style={styles.multilineInput} />
            <InputField label="Your Short Review" placeholder="Share a brief insight with the community" value={review} onChangeText={setReview} multiline style={styles.multilineInput} />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Course Media" subtitle="Upload custom thumbnail and certificate" />
            
            <Text style={styles.label}>Course Thumbnail</Text>
            <TouchableOpacity 
              style={[styles.miniUploadZone, thumbnailFile && styles.uploadZoneSuccess]} 
              onPress={handlePickThumbnail}
            >
              {thumbnailFile ? (
                <Image source={{ uri: thumbnailFile.uri }} style={styles.miniPreview} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
                  <Text style={styles.miniUploadText}>Pick Custom Thumbnail</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Completion Certificate</Text>
            <TouchableOpacity 
              style={[styles.uploadZone, certificateFile && styles.uploadZoneSuccess]} 
              onPress={handlePickCertificateFile}
            >
              <View style={styles.uploadIconCircle}>
                <Text style={styles.uploadEmoji}>{certificateFile ? '🏆' : '📂'}</Text>
              </View>
              <Text style={styles.uploadTitle}>
                {certificateFile ? certificateFile.name : 'Upload Certificate'}
              </Text>
              <Text style={styles.uploadSub}>
                {certificateFile ? `${(certificateFile.size / 1024 / 1024).toFixed(2)} MB` : 'PDF or Image (Max 10MB)'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.finalCard}>
              <Text style={styles.finalHeader}>Ready to Post</Text>
              <View style={styles.finalBody}>
                <Text style={styles.finalTitle} numberOfLines={2}>{title}</Text>
                <View style={styles.finalMeta}>
                  <Text style={styles.finalPlatform}>{platform}</Text>
                  <View style={styles.metaDot} />
                  <Text style={styles.finalRating}>⭐ {rating || '0'}.0</Text>
                </View>
              </View>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={{ fontSize: 20 }}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Achievement</Text>
        <View style={{ width: 40 }} />
      </View>

      <StepIndicator />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 0 && (
            <PrimaryButton 
              title="Previous" 
              onPress={prevStep} 
              variant="outline" 
              style={{ flex: 1, marginRight: SPACING.md }} 
            />
          )}
          {currentStep < STEPS.length - 1 ? (
            <PrimaryButton 
              title="Next Step" 
              onPress={nextStep} 
              style={{ flex: 2 }} 
            />
          ) : (
            <PrimaryButton 
              title="Publish Log" 
              onPress={handleSubmit} 
              loading={loading} 
              style={{ flex: 2 }} 
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl, 
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.borderLight 
  },
  headerTitle: { ...FONTS.h3, color: COLORS.textPrimary },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  indicatorContainer: {
    backgroundColor: COLORS.background,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  stepIndicator: { 
    flexDirection: 'row', 
    width: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepDot: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: COLORS.border, 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 2,
    ...SHADOW.xs,
  },
  stepDotActive: { backgroundColor: COLORS.accent },
  stepDotDone: { backgroundColor: COLORS.success },
  stepNum: { ...FONTS.tiny, color: COLORS.textMuted, fontSize: 10 },
  stepNumActive: { color: COLORS.white },
  stepCheck: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  stepLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: -2 },
  stepLineActive: { backgroundColor: COLORS.success },
  stepLabel: {
    ...FONTS.tiny,
    marginTop: 12,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  scroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: 140 },
  stepContent: { flex: 1 },
  label: { ...FONTS.label, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  fetchLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  fetchText: { ...FONTS.caption, marginLeft: SPACING.md, color: COLORS.accent },
  fetchActionRow: { marginTop: SPACING.sm, marginBottom: SPACING.sm, alignItems: 'flex-start' },
  fetchBtn: { minWidth: 130 },
  metadataSkeleton: { marginTop: SPACING.sm },
  metadataAlert: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  metadataAlertText: { ...FONTS.small, color: COLORS.textSecondary },
  retryInlineBtn: { marginTop: SPACING.sm },
  retryInlineText: { ...FONTS.captionBold, color: COLORS.accent },
  previewCard: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  previewThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.surfaceSubtle,
  },
  previewMeta: {
    padding: SPACING.md,
  },
  previewTitle: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  previewSub: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  previewBadgeRow: {
    marginTop: SPACING.sm,
    alignItems: 'flex-start',
  },
  previewBadge: {
    ...FONTS.small,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceSubtle,
  },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.md },
  ratingRow: { flexDirection: 'row', marginBottom: SPACING.xl },
  starBtn: { marginRight: SPACING.md },
  star: { fontSize: 42, color: COLORS.border },
  starActive: { color: '#F59E0B' },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  uploadZone: { 
    height: 180, 
    borderRadius: RADIUS.xxl, 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: COLORS.border, 
    backgroundColor: COLORS.background,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: SPACING.xl,
    padding: SPACING.xl,
  },
  uploadZoneSuccess: { borderColor: COLORS.success, backgroundColor: COLORS.successSoft },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  uploadEmoji: { fontSize: 24 },
  uploadTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  uploadSub: { ...FONTS.caption, color: COLORS.textMuted, marginTop: 4 },
  finalCard: {
    marginTop: SPACING['4xl'],
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOW.lg,
  },
  finalHeader: { ...FONTS.tiny, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  finalBody: { flex: 1 },
  finalTitle: { ...FONTS.h3, color: COLORS.white, fontSize: 16 },
  finalMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  finalPlatform: { ...FONTS.tiny, color: COLORS.accentLight },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  finalRating: { ...FONTS.tiny, color: COLORS.white },
  miniUploadZone: {
    height: 100,
    borderRadius: RADIUS.lg,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
    overflow: 'hidden',
  },
  miniPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  miniUploadText: {
    ...FONTS.tiny,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  footer: { 
    position: 'absolute', 
    bottom: 0, left: 0, right: 0, 
    flexDirection: 'row', 
    padding: SPACING.xl, 
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, 
    borderTopColor: COLORS.borderLight,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  }
});
