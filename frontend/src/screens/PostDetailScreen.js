import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { DEFAULT_IMAGE } from '../config/constants';
import PrimaryButton from '../components/PrimaryButton';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import CourseImage from '../components/CourseImage';
import EmptyState from '../components/EmptyState';
import { timeAgo } from '../utils/format';
import { showToast } from '../components/Toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import CertificateViewerModal from '../components/CertificateViewerModal';
import { getLocalComments, appendLocalComment } from '../services/localComments';

function flattenCommentTree(roots) {
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes || []) {
      if (!n) continue;
      const { replies, ...rest } = n;
      out.push(rest);
      if (Array.isArray(replies) && replies.length) walk(replies);
    }
  };
  walk(Array.isArray(roots) ? roots : []);
  return out;
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'certificate', label: 'Certificate' },
  { key: 'notes', label: 'Notes' },
  { key: 'activity', label: 'Activity' },
];

function createStyles(colors, isDark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: SPACING.xl,
    },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 120 },
    hero: { height: 360, backgroundColor: colors.primary },
    heroImg: { width: '100%', height: '100%', opacity: isDark ? 0.85 : 0.75 },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(2,6,23,0.45)' : 'rgba(15, 23, 42, 0.35)',
    },
    heroNav: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      zIndex: 10,
    },
    navBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: Platform.OS === 'android' ? 10 : 4,
    },
    heroBody: {
      position: 'absolute',
      bottom: 36,
      left: SPACING.xl,
      right: SPACING.xl,
    },
    platformChip: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
      marginBottom: 10,
    },
    platformText: {
      ...FONTS.tiny,
      color: colors.white,
      fontSize: 10,
      letterSpacing: 0.6,
    },
    heroTitle: {
      ...FONTS.h1,
      color: colors.white,
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '800',
    },
    mainContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: RADIUS.xxl,
      borderTopRightRadius: RADIUS.xxl,
      marginTop: -RADIUS.xxl,
      padding: SPACING.xl,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
    },
    tabRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: SPACING.lg,
    },
    tabBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      marginRight: 8,
      marginBottom: 8,
    },
    tabLabel: {
      ...FONTS.captionBold,
      fontSize: 12,
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    authorInfo: { flex: 1, marginLeft: SPACING.md },
    authorName: { ...FONTS.bodyBold, color: colors.textPrimary },
    authorMeta: { ...FONTS.caption, color: colors.textMuted },
    ratingBadge: {
      backgroundColor: colors.accentLight,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.md,
    },
    ratingText: { ...FONTS.captionBold, color: colors.accent },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: SPACING.lg,
      justifyContent: 'space-between',
    },
    metaCard: {
      flexGrow: 1,
      minWidth: '47%',
      padding: SPACING.md,
      marginBottom: 10,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSubtle,
    },
    metaCardLabel: {
      ...FONTS.tiny,
      color: colors.textMuted,
      marginBottom: 4,
    },
    metaCardValue: {
      ...FONTS.bodyBold,
      color: colors.textPrimary,
      fontSize: 15,
    },
    sectionTitle: {
      ...FONTS.label,
      color: colors.textMuted,
      marginBottom: 10,
      letterSpacing: 0.6,
    },
    insightText: {
      ...FONTS.body,
      color: colors.textPrimary,
      lineHeight: 24,
      marginBottom: SPACING.lg,
    },
    learningsContainer: { marginBottom: SPACING.lg },
    learningItem: {
      flexDirection: 'row',
      marginBottom: 10,
      alignItems: 'flex-start',
    },
    learningCheck: {
      color: colors.success,
      fontWeight: '800',
      marginRight: 12,
    },
    learningText: {
      ...FONTS.body,
      color: colors.textSecondary,
      flex: 1,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: SPACING.md,
    },
    tagItem: {
      ...FONTS.captionBold,
      color: colors.accent,
      marginRight: 12,
      marginBottom: 6,
    },
    certImage: {
      width: '100%',
      height: 220,
      borderRadius: RADIUS.lg,
      backgroundColor: colors.surfaceSubtle,
      marginBottom: SPACING.md,
    },
    pdfCard: {
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSubtle,
      marginBottom: SPACING.md,
    },
    pdfTitle: { ...FONTS.bodyBold, color: colors.textPrimary },
    pdfSub: { ...FONTS.small, color: colors.textSecondary, marginTop: 6 },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: SPACING.lg,
    },
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSubtle,
      marginRight: SPACING.md,
      marginBottom: SPACING.sm,
    },
    actionPillText: {
      ...FONTS.captionBold,
      marginLeft: 8,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: SPACING.lg,
    },
    discHeader: { marginBottom: SPACING.md },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      backgroundColor: colors.surfaceSubtle,
    },
    textInput: {
      flex: 1,
      marginHorizontal: SPACING.sm,
      ...FONTS.body,
      fontSize: 14,
      maxHeight: 88,
      color: colors.textPrimary,
      paddingTop: Platform.OS === 'ios' ? 8 : 4,
    },
    postBtnText: {
      ...FONTS.bodyBold,
      fontSize: 14,
      color: colors.textMuted,
      paddingTop: 6,
    },
    commentRow: { flexDirection: 'row', marginBottom: SPACING.lg },
    commentBody: { flex: 1, marginLeft: SPACING.md },
    commentTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    commentAuthor: { ...FONTS.captionBold, color: colors.textPrimary },
    commentTime: {
      ...FONTS.tiny,
      color: colors.textMuted,
      textTransform: 'none',
    },
    commentText: {
      ...FONTS.body,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    commentActions: { flexDirection: 'row', marginTop: 8 },
    actText: {
      ...FONTS.tiny,
      color: colors.textMuted,
      marginRight: 16,
      textTransform: 'none',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      padding: SPACING.xl,
      paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.xl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      ...SHADOW.lg,
    },
    cta: { borderRadius: RADIUS.lg },
    errorTitle: { ...FONTS.h3, color: colors.textPrimary, marginBottom: 16 },
  });
}

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const { bookmarks, toggleBookmark, user: currentUser } = useContext(AuthContext);
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const fetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (!postId || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const [postData, commentsData] = await Promise.all([
          api.getPost(postId),
          api.getComments(postId),
        ]);

        const serverList = flattenCommentTree(
          Array.isArray(commentsData) ? commentsData : commentsData?.comments || commentsData?.data || []
        );
        const localList = await getLocalComments(postId);
        const merged = [...localList, ...serverList].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

        if (isMounted) {
          setPost(postData);
          setComments(merged);
          setLiked(Boolean(postData?.isLikedByMe));
          setLikesCount(postData?.likesCount ?? 0);
          api.incrementViewCount(postId).catch(() => {});
        }
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [postId]);

  const handleOpenCourse = () => {
    if (!post?.url) return;
    navigation.navigate('CourseViewer', {
      url: post.url,
      title: post.title,
      id: post.id,
      courseId: post.id,
    });
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || isSubmitting) return;

    const originalText = commentText;
    setCommentText('');
    setIsSubmitting(true);

    try {
      const res = await api.addComment({
        postId,
        text: originalText.trim(),
        parentId: null,
      });
      setComments((prev) => [res, ...prev]);
      showToast({ message: 'Comment shared!', type: 'success' });
    } catch (err) {
      try {
        const item = await appendLocalComment(postId, {
          text: originalText.trim(),
          userName: currentUser?.name || 'You',
          userId: currentUser?._id || 'local',
        });
        setComments((prev) => [item, ...prev]);
        showToast({ message: 'Saved locally — will sync when the server is available', type: 'info' });
      } catch {
        setCommentText(originalText);
        showToast({ message: 'Failed to post comment', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const certUri =
    post?.certificateUrl ||
    (typeof post?.certificate === 'string' ? post.certificate : null);

  const toggleLike = async () => {
    if (!post?.id) return;
    const next = !liked;
    setLiked(next);
    setLikesCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      if (next) await api.likeCompletion(post.id);
      else await api.unlikeCompletion(post.id);
    } catch {
      setLiked(!next);
      setLikesCount((c) => Math.max(0, c + (next ? -1 : 1)));
      showToast({ message: 'Could not update like', type: 'error' });
    }
  };

  const sharePost = async () => {
    try {
      await Share.share({
        message: `${post.title}\n${post.url || ''}`.trim(),
        title: post.title,
      });
    } catch {
      /* dismissed */
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>We couldn’t load this achievement.</Text>
        <PrimaryButton
          title="Go back"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="sm"
        />
      </View>
    );
  }

  const isBookmarked = bookmarks.has(post.id);

  const renderTabBody = () => {
    if (activeTab === 'overview') {
      return (
        <>
          <Text style={styles.sectionTitle}>About this course</Text>
          <Text style={styles.insightText}>
            {post.description || 'No additional description provided.'}
          </Text>

          {post.learnings?.length > 0 ? (
            <View style={styles.learningsContainer}>
              <Text style={styles.sectionTitle}>What you learned</Text>
              {post.learnings.map((l, i) => (
                <View key={i} style={styles.learningItem}>
                  <Text style={styles.learningCheck}>✓</Text>
                  <Text style={styles.learningText}>{l}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.tagRow}>
            {post.tags?.map((t, i) => (
              <Text key={i} style={styles.tagItem}>
                #{t}
              </Text>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionPill} onPress={toggleLike} activeOpacity={0.85}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? colors.danger : colors.textPrimary} />
              <Text style={[styles.actionPillText, { color: colors.textPrimary }]}>{likesCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={sharePost} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
              <Text style={[styles.actionPillText, { color: colors.textPrimary }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (activeTab === 'certificate') {
      if (!certUri) {
        return (
          <EmptyState
            title="No certificate attached"
            subtitle="Certificates uploaded with a post appear here in full fidelity."
            compact
          />
        );
      }
      const lower = String(certUri).toLowerCase();
      const isPdf = lower.includes('.pdf') || lower.includes('application/pdf');
      return (
        <View>
          {!isPdf ? (
            <Image source={{ uri: certUri }} style={styles.certImage} resizeMode="contain" />
          ) : null}
          <Text style={[styles.pdfSub, { color: colors.textSecondary, marginBottom: SPACING.sm }]}>
            {isPdf ? 'Open the fullscreen viewer for PDF preview, download, and share.' : 'Pinch to zoom in fullscreen.'}
          </Text>
          <PrimaryButton title="Open viewer" onPress={() => setCertModalVisible(true)} size="sm" />
        </View>
      );
    }

    if (activeTab === 'notes') {
      return (
        <Text style={styles.insightText}>
          {post.review ||
            post.notes ||
            'No learner notes yet. Your review from publishing appears here when available.'}
        </Text>
      );
    }

    return (
      <View>
        <Text style={styles.insightText}>
          Track engagement and learning updates around this achievement — richer analytics are on the roadmap.
        </Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaCard}>
            <Text style={styles.metaCardLabel}>VIEWS</Text>
            <Text style={styles.metaCardValue}>{post.viewsCount ?? '—'}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaCardLabel}>ENGAGEMENT</Text>
            <Text style={styles.metaCardValue}>
              {likesCount} likes · {comments.length} replies
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <CourseImage uri={post.image || DEFAULT_IMAGE} style={styles.heroImg} />
          <View style={styles.heroOverlay} />

          <SafeAreaView style={styles.heroNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
              <Ionicons name="close" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleBookmark(post.id)}
              style={styles.navBtn}
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={colors.white}
              />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={styles.heroBody}>
            <View style={styles.platformChip}>
              <Text style={styles.platformText}>{post.platform}</Text>
            </View>
            <Text style={styles.heroTitle}>{post.title}</Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.authorRow}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('UserProfile', {
                  userId: typeof post.userId === 'object' ? post.userId?._id || post.userId?.id : post.userId,
                })
              }
            >
              <Avatar
                name={post.authorName}
                uri={typeof post.userId === 'object' ? post.userId?.profilePicture : undefined}
                size="md"
              />
            </TouchableOpacity>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{post.authorName}</Text>
              <Text style={styles.authorMeta}>
                {timeAgo(post.createdAt)} · {post.duration || 'Course'}
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>★ {post.rating?.toFixed(1) || '—'}</Text>
            </View>
          </View>

          <View style={styles.tabRow}>
            {TABS.map((t) => {
              const on = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setActiveTab(t.key)}
                  style={[
                    styles.tabBtn,
                    {
                      borderColor: on ? colors.accent : colors.border,
                      backgroundColor: on ? colors.accentLight : colors.surfaceSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: on ? colors.accent : colors.textSecondary },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {renderTabBody()}

          <View style={styles.separator} />

          <SectionHeader
            title={`Discussion (${comments.length})`}
            subtitle="Professional, constructive feedback"
            style={styles.discHeader}
          />

          <View style={styles.inputArea}>
            <Avatar name={currentUser?.name} size="sm" />
            <TextInput
              style={styles.textInput}
              placeholder="Share a thoughtful comment…"
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={!commentText.trim() || isSubmitting}
            >
              <Text
                style={[
                  styles.postBtnText,
                  commentText.trim() && { color: colors.accent },
                ]}
              >
                Post
              </Text>
            </TouchableOpacity>
          </View>

          {comments.map((c) => (
            <View key={c._id} style={styles.commentRow}>
              <Avatar
                name={typeof c.userId === 'object' ? c.userId?.name : undefined}
                uri={typeof c.userId === 'object' ? c.userId?.profilePicture : undefined}
                size="sm"
              />
              <View style={styles.commentBody}>
                <View style={styles.commentTop}>
                  <Text style={styles.commentAuthor}>
                    {(typeof c.userId === 'object' && c.userId?.name) || 'Learner'}
                  </Text>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity>
                    <Text style={styles.actText}>Like</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setCommentText(`@${(typeof c.userId === 'object' && c.userId?.name) || 'user'} `)
                    }
                  >
                    <Text style={styles.actText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Open course"
          onPress={handleOpenCourse}
          fullWidth
          style={styles.cta}
        />
      </View>

      <CertificateViewerModal
        visible={certModalVisible}
        onClose={() => setCertModalVisible(false)}
        uri={certUri}
        title={post.title}
      />
    </KeyboardAvoidingView>
  );
};

export default PostDetailScreen;
