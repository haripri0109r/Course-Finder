import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Animated,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import SectionHeader from '../components/SectionHeader';
import Chip from '../components/Chip';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../components/Toast';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

const PLATFORMS = ['Udemy', 'Coursera', 'YouTube', 'Other'];
const STEPS = [
  'Course URL',
  'Autofetch',
  'Details',
  'Thumbnail',
  'Certificate',
  'Progress & notes',
  'Review',
];

const MAX_BYTES = 10 * 1024 * 1024;

export default function AddCourseScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [author, setAuthor] = useState('');
  const [providerBadge, setProviderBadge] = useState('');
  const [publisher, setPublisher] = useState('');
  const [rating, setRating] = useState('');
  const [review, setReview] = useState('');
  const [image, setImage] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [learnings, setLearnings] = useState('');
  const [postTags, setPostTags] = useState('');
  const [courseThumbnail, setCourseThumbnail] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const [progressPercent, setProgressPercent] = useState('100');

  const [loading, setLoading] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const [metadataManualMode, setMetadataManualMode] = useState(false);
  const [metadataFetched, setMetadataFetched] = useState(false);
  const [generatedFallback, setGeneratedFallback] = useState(false);
  const [errors, setErrors] = useState({});

  const transitionToStep = (next) => {
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setCurrentStep(next);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
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

  const validateAssetSize = (asset, label) => {
    if (asset?.size != null && asset.size > MAX_BYTES) {
      showToast({ message: `${label} must be under 10 MB`, type: 'error' });
      return false;
    }
    return true;
  };

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
        const {
          title: t,
          thumbnail,
          author: a,
          duration: d,
          platform: p,
          providerBadge: b,
          description: desc,
          publisher: pub,
          generatedFallback: isGenerated,
        } = metadata;
        if (t) setTitle(t);
        if (thumbnail) setImage(thumbnail);
        else setImage('');
        if (a) setAuthor(a);
        if (d) setDuration(d);
        if (desc) setDescription(desc);
        if (pub) setPublisher(pub);
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
          setMetadataError('This provider blocks automatic metadata extraction. Continue with manual entry.');
        } else if (res.data?.reason === 'invalid_udemy_course') {
          setMetadataError('This link does not provide usable course details. Continue with manual entry.');
        } else if (res.data?.reason === 'low_quality_metadata') {
          setMetadataError('This link does not provide usable course details. Enter them manually.');
        } else {
          setMetadataError('Automatic extraction unavailable for this link.');
        }
        return;
      }

      setMetadataError('Automatic extraction unavailable for this link.');
    } catch (e) {
      const timedOut = e?.code === 'ECONNABORTED';
      setMetadataFetched(false);
      setMetadataError(
        timedOut ? 'Request timed out. Try again or continue manually.' : 'Could not fetch metadata. You can continue manually.'
      );
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
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        if (!validateAssetSize(a, 'Thumbnail')) return;
        setThumbnailFile(a);
        showToast({ message: 'Thumbnail selected', type: 'success' });
      }
    } catch (e) {
      showToast({ message: 'Thumbnail picker failed', type: 'error' });
    }
  };

  const pickThumbnailFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({ message: 'Photo library permission required', type: 'error' });
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      const fakeAsset = {
        uri: a.uri,
        name: a.fileName || 'thumbnail.jpg',
        mimeType: a.mimeType || 'image/jpeg',
        size: a.fileSize,
      };
      if (fakeAsset.size != null && !validateAssetSize(fakeAsset, 'Thumbnail')) return;
      setThumbnailFile(fakeAsset);
      showToast({ message: 'Thumbnail selected', type: 'success' });
    }
  };

  const handlePickCertificateFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        const mime = (a.mimeType || '').toLowerCase();
        const name = (a.name || '').toLowerCase();
        const ok = mime.startsWith('image/') || mime === 'application/pdf' || name.endsWith('.pdf');
        if (!ok) {
          showToast({ message: 'Certificate must be an image or PDF', type: 'error' });
          return;
        }
        if (!validateAssetSize(a, 'Certificate')) return;
        setCertificateFile(a);
        showToast({ message: 'Certificate selected', type: 'success' });
      }
    } catch (e) {
      showToast({ message: 'Certificate picker failed', type: 'error' });
    }
  };

  const goManualFromFetchStep = () => {
    setMetadataManualMode(true);
    setMetadataFetched(false);
    setMetadataError('');
    showToast({ message: 'Manual entry — fill details in the next step.', type: 'info' });
  };

  const nextStep = () => {
    setErrors({});
    if (currentStep === 0) {
      if (!url.trim() || !isValidHttpUrl(url)) {
        setErrors({ url: 'A valid http(s) course URL is required' });
        return;
      }
    }
    if (currentStep === 1) {
      if (!metadataFetched && !metadataManualMode) {
        setErrors({ fetch: 'Fetch metadata or choose “Continue without fetch”' });
        showToast({ message: 'Fetch course data or continue without autofetch', type: 'error' });
        return;
      }
    }
    if (currentStep === 2) {
      if (!title.trim() || !platform) {
        setErrors({
          title: !title.trim() ? 'Title is required' : null,
          platform: !platform ? 'Select a platform' : null,
        });
        return;
      }
    }
    if (currentStep === 4 && certificateFile) {
      if (!validateAssetSize(certificateFile, 'Certificate')) return;
    }
    if (currentStep === 5) {
      const n = Number(progressPercent);
      if (progressPercent.trim() === '' || Number.isNaN(n) || n < 0 || n > 100) {
        setErrors({ progress: 'Progress must be a number from 0 to 100' });
        return;
      }
    }

    if (currentStep < STEPS.length - 1) {
      transitionToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) transitionToStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const formData = new FormData();

      formData.append('title', title);
      formData.append('platform', platform);
      formData.append('url', url);
      formData.append('image', courseThumbnail || image);
      formData.append('duration', duration);
      formData.append('rating', rating);
      formData.append('review', review);
      formData.append('description', description);
      const p = Math.min(100, Math.max(0, Number(progressPercent) || 100));
      formData.append('progress', String(p));

      const learningsArr = learnings.split(',').map((i) => i.trim()).filter(Boolean);
      learningsArr.forEach((l) => formData.append('learnings[]', l));

      const tagsArr = postTags.split(',').map((i) => i.trim().toLowerCase()).filter(Boolean);
      tagsArr.forEach((t) => formData.append('tags[]', t));

      if (thumbnailFile) {
        formData.append('thumbnail', {
          uri: thumbnailFile.uri,
          name: thumbnailFile.name || 'thumbnail.jpg',
          type: thumbnailFile.mimeType || 'image/jpeg',
        });
      }

      if (certificateFile) {
        formData.append('certificate', {
          uri: certificateFile.uri,
          name: certificateFile.name || 'certificate.pdf',
          type: certificateFile.mimeType || 'application/pdf',
        });
      }

      await api.post('/completed', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast({ message: 'Course shared successfully', type: 'success' });
      navigation.navigate('Home');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to publish. Check your connection and uploads.';
      showToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const StepBar = () => {
    const pct = ((currentStep + 1) / STEPS.length) * 100;
    return (
      <View style={[styles.indicatorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
          Step {currentStep + 1} of {STEPS.length}
        </Text>
        <Text style={[styles.stepLabel, { color: colors.accent }]}>{STEPS[currentStep]}</Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
        </View>
      </View>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Paste course URL" subtitle="We will use this link on your portfolio and for metadata." />
            <InputField
              label="Course URL"
              placeholder="https://..."
              value={url}
              onChangeText={setUrl}
              error={errors.url}
              icon="🔗"
            />
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Autofetch metadata" subtitle="Pull title, instructor, and thumbnail when the provider allows it." />
            <PrimaryButton title="Fetch metadata" onPress={fetchMetadata} loading={isFetchingMetadata} style={{ marginTop: SPACING.sm }} />
            {errors.fetch ? <Text style={styles.fieldError}>{errors.fetch}</Text> : null}
            <TouchableOpacity onPress={goManualFromFetchStep} style={styles.secondaryLink}>
              <Text style={[styles.secondaryLinkText, { color: colors.accent }]}>Continue without fetch</Text>
            </TouchableOpacity>

            {isFetchingMetadata && (
              <View style={styles.metadataSkeleton}>
                <Text style={[styles.fetchText, { color: colors.accent }]}>Fetching course details…</Text>
                <LoadingSkeleton height={120} radius={RADIUS.md} style={{ marginTop: SPACING.sm }} />
              </View>
            )}

            {!isFetchingMetadata && metadataError ? (
              <View style={[styles.metadataAlert, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.metadataAlertText, { color: colors.textSecondary }]}>{metadataError}</Text>
                {!metadataManualMode && (
                  <TouchableOpacity onPress={fetchMetadata} style={styles.retryInlineBtn}>
                    <Text style={[styles.retryInlineText, { color: colors.accent }]}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {metadataFetched && !isFetchingMetadata && (
              <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {(thumbnailFile?.uri || courseThumbnail || image) ? (
                  <Image
                    source={{ uri: thumbnailFile?.uri || courseThumbnail || image }}
                    style={styles.previewThumb}
                  />
                ) : (
                  <View style={[styles.previewThumb, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceSubtle }]}>
                    <Ionicons name="school-outline" size={48} color={colors.textMuted} />
                    <Text style={{ ...FONTS.tiny, color: colors.textMuted, marginTop: 8 }}>Preview not available</Text>
                  </View>
                )}
                <View style={styles.previewMeta}>
                  <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {title || 'Untitled course'}
                  </Text>
                  {!!author && <Text style={[styles.previewSub, { color: colors.textSecondary }]}>{author}</Text>}
                  {!!publisher && <Text style={[styles.previewSub, { color: colors.textSecondary }]}>{publisher}</Text>}
                  <Text style={[styles.previewSub, { color: colors.textSecondary }]}>{duration || 'Duration unknown'}</Text>
                  <View style={styles.previewBadgeRow}>
                    <Text style={[styles.previewBadge, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}>
                      {providerBadge || platform || 'Other'}
                    </Text>
                    {generatedFallback && (
                      <Text style={[styles.previewBadge, { backgroundColor: '#F59E0B', color: COLORS.white, borderColor: '#F59E0B' }]}>
                        Auto-generated from URL
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {metadataManualMode && !isFetchingMetadata && (
              <Text style={[styles.manualHint, { color: colors.textSecondary }]}>
                You can enter or adjust all fields in the next step.
              </Text>
            )}
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Edit details" subtitle="Confirm or complete course information." />
            <InputField label="Title" value={title} onChangeText={setTitle} error={errors.title} />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Platform</Text>
            <View style={styles.platformRow}>
              {PLATFORMS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  selected={platform === p}
                  onPress={() => setPlatform(p)}
                  variant={platform === p ? 'filled' : 'soft'}
                />
              ))}
            </View>
            {errors.platform ? <Text style={styles.fieldError}>{errors.platform}</Text> : null}
            <InputField label="Estimated duration" placeholder="e.g. 12 hours" value={duration} onChangeText={setDuration} icon="⌛" />
            <InputField label="Instructor / author" placeholder="e.g. Andrew Ng" value={author} onChangeText={setAuthor} icon="👤" />
            <InputField
              label="Description"
              placeholder="What is this course about?"
              value={description}
              onChangeText={setDescription}
              multiline
              style={styles.multilineInput}
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Thumbnail" subtitle="Optional URL, gallery pick, or file (max 10 MB)." />
            <InputField
              label="Thumbnail image URL (optional)"
              placeholder="https://…"
              value={courseThumbnail}
              onChangeText={setCourseThumbnail}
              icon="🖼️"
            />
            <View style={styles.uploadRow}>
              <PrimaryButton title="Photo library" onPress={pickThumbnailFromLibrary} variant="outline" style={{ flex: 1, marginRight: SPACING.sm }} />
              <PrimaryButton title="Pick file" onPress={handlePickThumbnail} variant="outline" style={{ flex: 1 }} />
            </View>
            {thumbnailFile ? (
              <View style={styles.thumbPreviewWrap}>
                <Image source={{ uri: thumbnailFile.uri }} style={styles.thumbPreview} />
                <TouchableOpacity onPress={() => setThumbnailFile(null)} style={styles.removePill}>
                  <Text style={styles.removePillText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Certificate" subtitle="PDF or image, max 10 MB. Optional but recommended." />
            <TouchableOpacity
              style={[styles.uploadZone, certificateFile && styles.uploadZoneSuccess, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={handlePickCertificateFile}
            >
              <View style={[styles.uploadIconCircle, { backgroundColor: colors.surface }]}>
                <Text style={styles.uploadEmoji}>{certificateFile ? '🏆' : '📂'}</Text>
              </View>
              <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>
                {certificateFile ? certificateFile.name : 'Upload certificate'}
              </Text>
              <Text style={[styles.uploadSub, { color: colors.textMuted }]}>
                {certificateFile && certificateFile.size != null
                  ? `${(certificateFile.size / 1024 / 1024).toFixed(2)} MB`
                  : 'PDF or image'}
              </Text>
            </TouchableOpacity>
            {certificateFile ? (
              <TouchableOpacity onPress={() => setCertificateFile(null)} style={styles.removePill}>
                <Text style={styles.removePillText}>Remove certificate</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Progress & notes" subtitle="Tags, completion progress, rating, and what you learned." />
            <InputField
              label="Tags / categories (comma-separated)"
              placeholder="react, system design, leadership"
              value={postTags}
              onChangeText={setPostTags}
              icon="🏷️"
            />
            <InputField
              label="Completion progress (0–100)"
              placeholder="100"
              value={progressPercent}
              onChangeText={setProgressPercent}
              keyboardType="number-pad"
              error={errors.progress}
              icon="📊"
            />
            <Text style={[styles.label, { color: colors.textPrimary }]}>Rating</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(String(n))} activeOpacity={0.7} style={styles.starBtn}>
                  <Text style={[styles.star, Number(rating) >= n && styles.starActive]}>{Number(rating) >= n ? '★' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <InputField
              label="Key learnings (comma-separated)"
              placeholder="Hooks, performance, testing…"
              value={learnings}
              onChangeText={setLearnings}
              multiline
              style={styles.multilineInput}
            />
            <InputField
              label="Short review"
              placeholder="Share a takeaway for the community"
              value={review}
              onChangeText={setReview}
              multiline
              style={styles.multilineInput}
            />
          </View>
        );
      case 6:
        return (
          <View style={styles.stepContent}>
            <SectionHeader title="Review & publish" subtitle="Everything below will appear on your portfolio." />
            <View style={styles.finalCard}>
              <Text style={styles.finalHeader}>Summary</Text>
              <Text style={styles.finalTitle} numberOfLines={3}>
                {title || 'Untitled'}
              </Text>
              <View style={styles.finalMeta}>
                <Text style={styles.finalPlatform}>{platform || '—'}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.finalRating}>⭐ {rating || '—'}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.finalRating}>{progressPercent}% done</Text>
              </View>
              <Text style={styles.finalTiny} numberOfLines={2}>
                {url}
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { borderBottomColor: colors.borderLight, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={{ fontSize: 20, color: colors.textPrimary }}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Log achievement</Text>
        <View style={{ width: 40 }} />
      </View>

      <StepBar />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fade }}>{renderStep()}</Animated.View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          {currentStep > 0 && (
            <PrimaryButton title="Back" onPress={prevStep} variant="outline" style={{ flex: 1, marginRight: SPACING.md }} />
          )}
          {currentStep < STEPS.length - 1 ? (
            <PrimaryButton title="Next" onPress={nextStep} style={{ flex: 2 }} />
          ) : (
            <PrimaryButton title="Publish" onPress={handleSubmit} loading={loading} style={{ flex: 2 }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
  },
  headerTitle: { ...FONTS.h3 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
  indicatorContainer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  stepCount: { ...FONTS.caption },
  stepLabel: {
    ...FONTS.tiny,
    marginTop: 6,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  scroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: 140 },
  stepContent: { flex: 1 },
  label: { ...FONTS.label, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  fieldError: { ...FONTS.tiny, color: COLORS.danger, marginTop: 4 },
  fetchText: { ...FONTS.caption, marginLeft: 0 },
  metadataSkeleton: { marginTop: SPACING.sm },
  metadataAlert: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  metadataAlertText: { ...FONTS.small },
  retryInlineBtn: { marginTop: SPACING.sm },
  retryInlineText: { ...FONTS.captionBold },
  previewCard: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.surfaceSubtle,
  },
  previewMeta: { padding: SPACING.md },
  previewTitle: { ...FONTS.bodyBold, fontSize: 14 },
  previewSub: { ...FONTS.small, marginTop: 4 },
  previewBadgeRow: { marginTop: SPACING.sm, alignItems: 'flex-start', flexWrap: 'wrap' },
  previewBadge: {
    ...FONTS.small,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  manualHint: { ...FONTS.small, marginTop: SPACING.md },
  secondaryLink: { marginTop: SPACING.md, alignItems: 'center' },
  secondaryLinkText: { ...FONTS.captionBold },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.md },
  ratingRow: { flexDirection: 'row', marginBottom: SPACING.xl },
  starBtn: { marginRight: SPACING.md },
  star: { fontSize: 42, color: COLORS.border },
  starActive: { color: '#F59E0B' },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  uploadRow: { flexDirection: 'row', marginTop: SPACING.md },
  thumbPreviewWrap: { marginTop: SPACING.md, borderRadius: RADIUS.md, overflow: 'hidden' },
  thumbPreview: { width: '100%', aspectRatio: 16 / 9, backgroundColor: COLORS.surfaceSubtle },
  removePill: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.dangerSoft,
  },
  removePillText: { ...FONTS.captionBold, color: COLORS.danger },
  uploadZone: {
    height: 180,
    borderRadius: RADIUS.xxl,
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    padding: SPACING.xl,
  },
  uploadZoneSuccess: { borderColor: COLORS.success, backgroundColor: COLORS.successSoft },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  uploadEmoji: { fontSize: 24 },
  uploadTitle: { ...FONTS.bodyBold },
  uploadSub: { ...FONTS.caption, marginTop: 4 },
  finalCard: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOW.lg,
  },
  finalHeader: { ...FONTS.tiny, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  finalTitle: { ...FONTS.h3, color: COLORS.white, fontSize: 16 },
  finalMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  finalPlatform: { ...FONTS.tiny, color: COLORS.accentLight },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  finalRating: { ...FONTS.tiny, color: COLORS.white },
  finalTiny: { ...FONTS.tiny, color: 'rgba(255,255,255,0.75)', marginTop: SPACING.sm },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.xl,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  },
});
