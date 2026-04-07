import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import NetInfo from '@react-native-community/netinfo';
import api from '../services/api';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import SkeletonPreview from '../components/SkeletonPreview';
import CoursePreview from '../components/CoursePreview';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { showToast } from '../components/Toast';

const PLATFORMS = ['Udemy', 'Coursera', 'YouTube', 'Other'];

/**
 * Normalizes URL similarly to the backend for consistency.
 */
const normalizeUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      u.search = v ? `?v=${v}` : '';
    } else if (u.hostname.includes('youtu.be')) {
      u.search = '';
    } else {
      u.search = '';
    }
    return u.toString();
  } catch {
    return url;
  }
};

export default function AddCourseScreen() {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');
  const [rating, setRating] = useState('');
  const [review, setReview] = useState('');
  const [image, setImage] = useState('');
  const [duration, setDuration] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [certificatePublicId, setCertificatePublicId] = useState('');
  const [certificatePreviewUri, setCertificatePreviewUri] = useState('');
  const [stagedAsset, setStagedAsset] = useState(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const lastUrlRef = useRef('');

  // ─── Auto-Metadata Fetching (Debounced) ───────────────────────────────────
  useEffect(() => {
    if (!url || url === lastUrlRef.current) return;

    // 3. Prevent Fetch on Empty / Invalid URL
    if (url.length < 10 || !url.startsWith("http")) return;

    lastUrlRef.current = url;
    setFetchError(null);

    const timer = setTimeout(() => {
      fetchMetadata(url);
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [url]);

  const fetchMetadata = async (targetUrl) => {
    try {
      setIsFetchingMetadata(true);
      setFetchError(null);
      
      const response = await api.fetchMetadata(targetUrl);
      
      if (response.data.success) {
        const { title: fetchedTitle, image: fetchedImage, provider, duration: fetchedDuration } = response.data.data;
        
        // Auto-fill logic
        if (fetchedTitle && !title) setTitle(fetchedTitle);
        if (fetchedImage && !image) {
          setImage(fetchedImage);
          if (fetchedImage.startsWith('http')) {
            Image.prefetch(fetchedImage).catch(() => {});
          }
        }
        if (fetchedDuration && !duration) setDuration(fetchedDuration);
        if (provider && !platform) {
          const matched = PLATFORMS.find(p => p.toLowerCase() === provider.toLowerCase());
          setPlatform(matched || 'Other');
        }
        
        showToast('Course metadata fetched! ✨', 'success');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // 6. Handle 404 Gracefully
        console.warn("Metadata API route not found");
        setFetchError('Metadata service endpoint not found (404). Contact support or fill manually.');
      } else {
        console.warn("Metadata fetch failed:", err.message);
        setFetchError('Metadata not found. Please fill manually.');
      }
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!platform) newErrors.platform = 'Please select a platform';
    
    if (!url) newErrors.url = 'Course URL is required';
    else if (!url.startsWith('http')) newErrors.url = 'Invalid URL (must start with http/https)';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickCertificate = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCertificatePreviewUri(result.assets[0].uri);
        setStagedAsset(result.assets[0]);
        await uploadCertificateFile(result.assets[0]);
      }
    } catch (error) {
      showToast('Failed to open file picker', 'error');
    }
  };

  const retryUpload = async () => {
    if (stagedAsset) {
      await uploadCertificateFile(stagedAsset);
    }
  };

  const uploadCertificateFile = async (asset) => {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        showToast('No internet connection', 'error');
        setUploadFailed(true);
        return;
      }

      setUploadingCert(true);
      setUploadFailed(false);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'document.pdf',
        type: asset.mimeType || 'application/pdf',
      });
      // Pass old info for cleanup if replacing
      if (certificatePublicId) {
        formData.append('oldPublicId', certificatePublicId);
        formData.append('oldResourceType', certificateUrl.endsWith('.pdf') ? 'raw' : 'image');
      }

      const response = await api.post('/completed/upload-certificate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
           const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
           setUploadProgress(percentCompleted);
        }
      });
      
      if (response.data.success) {
        setCertificateUrl(response.data.url);
        setCertificatePublicId(response.data.public_id || '');
        showToast('Certificate uploaded securely!', 'success');
      } else {
        showToast(response.data.message || 'Verification failed', 'error');
        setUploadFailed(true);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to upload certificate';
      showToast(msg, 'error');
      setUploadFailed(true);
    } finally {
      setUploadingCert(false);
    }
  };

  const handleSubmit = async () => {
    if (uploadingCert) {
      showToast('Please wait for the certificate to finish uploading.', 'info');
      return;
    }
    if (uploadFailed) {
      showToast('Please retry the certificate upload before submitting.', 'error');
      return;
    }
    if (!validate()) return;

    try {
      setLoading(true);
      const response = await api.post('/completed', {
        title, platform, url,
        image,
        duration,
        certificateUrl,
        certificatePublicId,
        rating: rating ? Number(rating) : undefined,
        review,
      });
      showToast(response.data.message || 'Course logged successfully!', 'success');
      setTitle(''); setPlatform(''); setUrl(''); setRating(''); setReview(''); setImage(''); setDuration(''); setCertificateUrl(''); setCertificatePublicId(''); setCertificatePreviewUri(''); setStagedAsset(null); setUploadFailed(false);
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

        {isFetchingMetadata && <SkeletonPreview />}

        {!isFetchingMetadata && (title || image || platform) ? (
          <CoursePreview 
            title={title}
            image={image}
            platform={platform}
            duration={duration}
          />
        ) : null}

        {fetchError && (
          <TouchableOpacity style={styles.retryRow} onPress={() => fetchMetadata(url)}>
            <Text style={styles.errorTextSmall}>{fetchError}</Text>
            <Text style={styles.retryText}> - Tap to Retry</Text>
          </TouchableOpacity>
        )}

        <InputField
          label="Course Thumbnail URL (optional)"
          placeholder="https://.../image.jpg"
          value={image}
          onChangeText={setImage}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Certificate</Text>
        <TouchableOpacity 
          style={styles.uploadBtn} 
          onPress={uploadFailed ? retryUpload : handlePickCertificate}
          disabled={uploadingCert}
          activeOpacity={0.7}
        >
          <Text style={[styles.uploadBtnText, uploadFailed && { color: '#EF4444' }]}>
            {uploadingCert ? `⏳ Uploading... ${uploadProgress}%` : uploadFailed ? '⚠️ Upload Failed - Tap to Retry' : certificateUrl ? '🔄 Replace Document' : '📤 Upload Document'}
          </Text>
        </TouchableOpacity>

        {certificatePreviewUri && !uploadFailed ? (
          <View style={styles.previewContainer}>
             {certificatePreviewUri.endsWith('.pdf') ? (
               <Text style={styles.pdfPreview}>📄 PDF Document Readied</Text>
             ) : (
               <Image source={{ uri: certificatePreviewUri }} style={styles.imagePreview} />
             )}
             {uploadingCert && <Text style={styles.successTextSmall}>Synchronizing with Cloud...</Text>}
             {certificateUrl !== '' && !uploadingCert && <Text style={styles.successTextSmall}>✅ Successfully Synced!</Text>}
          </View>
        ) : null}

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

  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  fetchingText: {
    ...FONTS.small,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '600',
  },
  retryRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  retryText: {
    ...FONTS.small,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },

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

  uploadBtn: {
    backgroundColor: `${COLORS.secondary}15`,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  uploadBtnText: {
    color: COLORS.secondary,
    fontWeight: '700',
    ...FONTS.body,
  },
  previewContainer: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfPreview: {
    ...FONTS.caption,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imagePreview: {
    width: 200,
    height: 120,
    borderRadius: RADIUS.md,
    resizeMode: 'cover',
    marginBottom: SPACING.xs,
  },
  successTextSmall: {
    ...FONTS.caption,
    color: COLORS.secondary,
    marginLeft: SPACING.xs,
    marginBottom: SPACING.xl,
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
