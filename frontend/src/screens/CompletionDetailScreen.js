import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import AnimatedPressable from '../components/AnimatedPressable';
import SkeletonDetail from '../components/SkeletonDetail';
import RetryBox from '../components/RetryBox';
import { timeAgo } from '../utils/format';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function CompletionDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  
  const [completion, setCompletion] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  const fetchData = async (isRefresh = false, signal = null) => {
    try {
      setError(null);
      if (!isRefresh && !completion) setLoading(true);
      const startTime = Date.now();
      
      const [compRes, commRes] = await Promise.all([
        api.getCompletedCourse(id, { signal }),
        api.getComments(id, { signal })
      ]);

      if (compRes.data.success) {
        console.log("API Response:", compRes.data);
        setCompletion(compRes.data.data);
      }
      if (commRes.data.success) setComments(commRes.data.data);

      const elapsed = Date.now() - startTime;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      
      setError(err);
      if (err.response?.status === 404) {
        showToast('This post has been removed', 'error');
      } else {
        showToast('Could not load discussion', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    console.log("Clicked ID:", id);
    fetchData(false, controller.signal);
    return () => controller.abort();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleLike = async () => {
    if (!completion || isLikeLoading) return;
    const isLiked = completion.isLikedByMe;
    
    // Optimistic Update
    setCompletion({ 
      ...completion, 
      isLikedByMe: !isLiked,
      likesCount: isLiked ? completion.likesCount - 1 : completion.likesCount + 1
    });
    setIsLikeLoading(true);

    try {
      if (isLiked) await api.unlikeCompletion(id);
      else await api.likeCompletion(id);
    } catch (err) {
      // Revert on error
      setCompletion(completion);
      showToast('Interaction failed', 'error');
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (isBookmarkLoading) return;
    setIsBookmarkLoading(true);
    try {
      await toggleBookmark(id);
    } catch (err) {
      showToast('Bookmark failed', 'error');
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;
    try {
      setSubmitting(true);
      const res = await api.addComment(id, commentText.trim());
      if (res.data.success) {
        setComments([res.data.data, ...comments]);
        setCommentText('');
        showToast('Comment posted!', 'success');
      }
    } catch (err) {
      showToast('Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SkeletonDetail />;
  if (error && !completion) return <RetryBox message="Unable to load post" error={error} onRetry={() => fetchData(false)} />;
  if (!completion) return null;

  const isLiked = completion.isLikedByMe;
  const isBookmarked = bookmarks.has(id);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.backIcon}>←</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Discussion</Text>
        <AnimatedPressable 
          onPress={handleBookmark} 
          style={styles.headerBtn}
          disabled={isBookmarkLoading}
          haptic="impactMedium"
        >
          <Text style={{ fontSize: 22 }}>{isBookmarked ? '🔖' : '🔖'}</Text>
          {!isBookmarked && <View style={styles.bookmarkOverlay} />}
        </AnimatedPressable>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <AnimatedPressable 
          style={styles.authorRow}
          onPress={() => navigation.navigate('UserProfile', { userId: completion.userId })}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(completion.authorName || 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.authorName}>{completion.authorName}</Text>
            <Text style={styles.timestamp}>{timeAgo(completion.createdAt)}</Text>
          </View>
        </AnimatedPressable>

        <View style={styles.contentCard}>
          <Text style={styles.courseTitle}>{completion.title}</Text>
          <View style={styles.courseHeaderRow}>
            <Text style={styles.platform}>{completion.platform}</Text>
            {completion.duration && completion.duration !== 'N/A' && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>⌛ {completion.duration}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{'⭐'.repeat(Math.round(completion.rating || 0))}</Text>
            <Text style={styles.ratingVal}>{completion.rating?.toFixed(1)} / 5.0</Text>
          </View>

          {completion.review ? (
            <View style={styles.reviewBox}>
              <Text style={styles.reviewText}>{completion.review}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <AnimatedPressable 
              onPress={handleLike} 
              style={styles.actionBtn}
              disabled={isLikeLoading}
              haptic="impactMedium"
            >
              <Text style={styles.actionEmoji}>{isLiked ? '❤️' : '🤍'}</Text>
              <Text style={styles.actionText}>{completion.likesCount} Likes</Text>
            </AnimatedPressable>
            <View style={styles.actionBtn}>
              <Text style={styles.actionEmoji}>💬</Text>
              <Text style={styles.actionText}>{comments.length} Comments</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Community Feedback</Text>
        {comments.map((item) => (
          <View key={item._id} style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{item.user?.name}</Text>
              <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        ))}
        {comments.length === 0 && (
          <View style={styles.emptyComments}>
            <Text style={styles.noComments}>No comments yet. Start the conversation!</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Share your thoughts..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
          placeholderTextColor={COLORS.textMuted}
        />
        <AnimatedPressable 
          style={[styles.sendBtn, !commentText.trim() && styles.disabledSend]} 
          onPress={handleAddComment}
          disabled={!commentText.trim() || submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendText}>Post</Text>}
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    height: 110, paddingTop: 60, flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', paddingHorizontal: SPACING.lg, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, ...SHADOW.sm 
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, fontWeight: 'bold' },
  headerTitle: { ...FONTS.h3 },
  bookmarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
  },

  scrollContent: { padding: SPACING.xl, paddingBottom: 120 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  authorName: { ...FONTS.bodyBold, fontSize: 17 },
  timestamp: { ...FONTS.small, color: COLORS.textMuted, marginTop: 2 },

  contentCard: { backgroundColor: COLORS.card, padding: SPACING.xl, borderRadius: RADIUS.lg, ...SHADOW.md, marginBottom: SPACING.xxxl },
  courseTitle: { ...FONTS.h2, fontSize: 22, marginBottom: 4 },
  courseHeaderRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: SPACING.md 
  },
  platform: { ...FONTS.caption, color: COLORS.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  durationBadge: {
    backgroundColor: `${COLORS.secondary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.md,
  },
  durationText: {
    ...FONTS.small,
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  stars: { fontSize: 20, marginRight: 8 },
  ratingVal: { ...FONTS.caption, fontWeight: '700', color: COLORS.textPrimary },
  reviewBox: { backgroundColor: COLORS.background, padding: SPACING.lg, borderRadius: RADIUS.md, marginBottom: SPACING.xl },
  reviewText: { ...FONTS.body, fontStyle: 'italic', color: COLORS.textSecondary, lineHeight: 24 },

  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: SPACING.lg },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: SPACING.xxl },
  actionEmoji: { fontSize: 20, marginRight: 8 },
  actionText: { ...FONTS.small, fontWeight: '700', color: COLORS.textPrimary },

  sectionTitle: { ...FONTS.h3, marginBottom: SPACING.lg, fontSize: 18 },
  commentCard: { backgroundColor: COLORS.card, padding: SPACING.lg, borderRadius: RADIUS.md, marginBottom: SPACING.md, borderLeftWidth: 4, borderLeftColor: COLORS.primaryLight, ...SHADOW.sm },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentAuthor: { ...FONTS.small, fontWeight: '800', color: COLORS.textPrimary },
  commentTime: { ...FONTS.small, color: COLORS.textMuted, fontSize: 10 },
  commentText: { ...FONTS.body, fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  emptyComments: { paddingVertical: 40, alignItems: 'center' },
  noComments: { ...FONTS.caption, textAlign: 'center', color: COLORS.textMuted },

  inputArea: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, 
    flexDirection: 'row', padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg, 
    alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.borderLight, ...SHADOW.md
  },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xl, paddingVertical: 12, marginRight: SPACING.md, maxHeight: 120, ...FONTS.body, fontSize: 15 },
  sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.pill, ...SHADOW.sm },
  disabledSend: { opacity: 0.4 },
  sendText: { color: COLORS.white, fontWeight: '800', fontSize: 15 }
});
