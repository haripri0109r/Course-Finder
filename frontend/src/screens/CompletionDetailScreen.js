import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import AnimatedPressable from '../components/AnimatedPressable';
import SkeletonDetail from '../components/SkeletonDetail';
import RetryBox from '../components/RetryBox';
import Avatar from '../components/Avatar';
import { timeAgo } from '../utils/format';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function CompletionDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(colors, insets), [colors, insets]);

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
        api.getComments(id, { signal }),
      ]);

      if (compRes.data.success) setCompletion(compRes.data.data);
      if (commRes.data.success) setComments(commRes.data.data);

      const elapsed = Date.now() - startTime;
      if (elapsed < 300) await new Promise((r) => setTimeout(r, 300 - elapsed));
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setError(err);
      showToast({ message: 'Could not load discussion', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(false, controller.signal);
    return () => controller.abort();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleLike = async () => {
    if (!completion || isLikeLoading) return;
    const wasLiked = completion.isLikedByMe;
    setCompletion({
      ...completion,
      isLikedByMe: !wasLiked,
      likesCount: wasLiked ? completion.likesCount - 1 : completion.likesCount + 1,
    });
    setIsLikeLoading(true);
    try {
      if (wasLiked) await api.unlikeCompletion(id);
      else await api.likeCompletion(id);
    } catch (err) {
      setCompletion(completion);
      showToast({ message: 'Interaction failed', type: 'error' });
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
      showToast({ message: 'Bookmark failed', type: 'error' });
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
        showToast({ message: 'Comment posted!', type: 'success' });
      }
    } catch (err) {
      showToast({ message: 'Failed to post comment', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SkeletonDetail />;
  if (error && !completion)
    return <RetryBox message="Unable to load post" error={error} onRetry={() => fetchData(false)} />;
  if (!completion) return null;

  const isLiked = completion.isLikedByMe;
  const isBookmarked = bookmarks.has(id);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Discussion</Text>
        <TouchableOpacity
          onPress={handleBookmark}
          style={s.headerBtn}
          activeOpacity={0.7}
          disabled={isBookmarkLoading}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isBookmarked ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
        >
          {/* Author row */}
          <TouchableOpacity
            style={s.authorRow}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('UserProfile', { userId: completion.userId })}
          >
            <Avatar name={completion.authorName} size="md" />
            <View style={{ marginLeft: SPACING.md }}>
              <Text style={s.authorName}>{completion.authorName}</Text>
              <Text style={s.timestamp}>{timeAgo(completion.createdAt)}</Text>
            </View>
          </TouchableOpacity>

          {/* Content card */}
          <View style={s.contentCard}>
            <Text style={s.courseTitle}>{completion.title}</Text>
            <View style={s.courseHeaderRow}>
              <Text style={s.platform}>{completion.platform}</Text>
              {completion.duration && completion.duration !== 'N/A' && (
                <View style={s.durationBadge}>
                  <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                  <Text style={s.durationText}>{completion.duration}</Text>
                </View>
              )}
            </View>

            <View style={s.ratingRow}>
              <View style={s.starsRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < Math.round(completion.rating || 0) ? 'star' : 'star-outline'}
                    size={16}
                    color={colors.warning || '#FBBF24'}
                    style={{ marginRight: 2 }}
                  />
                ))}
              </View>
              <Text style={s.ratingVal}>{completion.rating?.toFixed(1)} / 5.0</Text>
            </View>

            {completion.review ? (
              <View style={s.reviewBox}>
                <Text style={s.reviewText}>{completion.review}</Text>
              </View>
            ) : null}

            <View style={s.actionRow}>
              <TouchableOpacity
                onPress={handleLike}
                style={s.actionBtn}
                activeOpacity={0.7}
                disabled={isLikeLoading}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isLiked ? colors.danger : colors.textSecondary}
                />
                <Text style={s.actionText}>{completion.likesCount}</Text>
              </TouchableOpacity>
              <View style={s.actionBtn}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                <Text style={s.actionText}>{comments.length}</Text>
              </View>
            </View>
          </View>

          {/* Comments */}
          <Text style={s.sectionTitle}>Community Feedback</Text>
          {comments.map((item) => (
            <View key={item._id} style={s.commentCard}>
              <View style={s.commentHeader}>
                <View style={s.commentAuthorRow}>
                  <Avatar name={item.user?.name} size="xs" />
                  <Text style={s.commentAuthor}>{item.user?.name}</Text>
                </View>
                <Text style={s.commentTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={s.commentText}>{item.text}</Text>
            </View>
          ))}
          {comments.length === 0 && (
            <View style={s.emptyComments}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
              <Text style={s.noComments}>No comments yet. Start the conversation!</Text>
            </View>
          )}
        </ScrollView>

        {/* Comment Input */}
        <View style={[s.inputArea, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          <Avatar name={currentUser?.name} size="sm" />
          <TextInput
            style={s.input}
            placeholder="Share your thoughts..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            placeholderTextColor={colors.textMuted}
            underlineColorAndroid="transparent"
            selectionColor={colors.accent}
            cursorColor={colors.accent}
          />
          <TouchableOpacity
            onPress={handleAddComment}
            style={[s.sendBtn, !commentText.trim() && s.disabledSend]}
            activeOpacity={0.7}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors, insets) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBtn: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      ...FONTS.h3,
      color: colors.textPrimary,
    },

    // Scroll
    scrollContent: {
      padding: SPACING.xl,
      paddingBottom: 120,
    },

    // Author
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    authorName: {
      ...FONTS.bodyBold,
      color: colors.textPrimary,
    },
    timestamp: {
      ...FONTS.small,
      color: colors.textMuted,
      marginTop: 2,
    },

    // Content card
    contentCard: {
      backgroundColor: colors.surface,
      padding: SPACING.xl,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: SPACING.xxxl,
    },
    courseTitle: {
      ...FONTS.h2,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    courseHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    platform: {
      ...FONTS.captionBold,
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    durationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
      marginLeft: SPACING.md,
      gap: 4,
    },
    durationText: {
      ...FONTS.small,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    starsRow: {
      flexDirection: 'row',
      marginRight: 8,
    },
    ratingVal: {
      ...FONTS.captionBold,
      color: colors.textPrimary,
    },
    reviewBox: {
      backgroundColor: colors.background,
      padding: SPACING.lg,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.xl,
    },
    reviewText: {
      ...FONTS.body,
      fontStyle: 'italic',
      color: colors.textSecondary,
      lineHeight: 24,
    },
    actionRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: SPACING.lg,
      gap: SPACING.xl,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      justifyContent: 'center',
    },
    actionText: {
      ...FONTS.small,
      fontWeight: '700',
      color: colors.textPrimary,
    },

    // Comments
    sectionTitle: {
      ...FONTS.h3,
      color: colors.textPrimary,
      marginBottom: SPACING.lg,
    },
    commentCard: {
      backgroundColor: colors.surface,
      padding: SPACING.lg,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.md,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.border,
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    commentAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    commentAuthor: {
      ...FONTS.small,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    commentTime: {
      ...FONTS.small,
      color: colors.textMuted,
      fontSize: 10,
    },
    commentText: {
      ...FONTS.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    emptyComments: {
      paddingVertical: 40,
      alignItems: 'center',
      gap: SPACING.md,
    },
    noComments: {
      ...FONTS.caption,
      textAlign: 'center',
      color: colors.textMuted,
    },

    // Input
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: SPACING.sm,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.lg,
      paddingVertical: 10,
      maxHeight: 100,
      ...FONTS.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabledSend: {
      opacity: 0.4,
    },
  });
}
