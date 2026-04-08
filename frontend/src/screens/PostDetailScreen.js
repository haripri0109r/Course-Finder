import React, { useState, useEffect, useRef, useContext } from 'react';
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
  Platform
} from 'react-native';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import SkeletonDetail from '../components/SkeletonDetail';
import { DEFAULT_IMAGE } from '../config/constants';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedPressable from '../components/AnimatedPressable';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { timeAgo } from '../utils/format';
import { showToast } from '../components/Toast';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const { bookmarks, toggleBookmark } = useContext(AuthContext);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (!postId || fetchedRef.current) return;

    fetchedRef.current = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const [postData, commentsData] = await Promise.all([
          api.getPost(postId),
          api.getComments(postId)
        ]);

        if (isMounted) {
          setPost(postData);
          setComments(commentsData);
          // Track view asynchronously
          api.incrementViewCount(postId).catch(() => { });
        }
      } catch (err) {
        console.error("Fetch detail error:", err);
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

    navigation.navigate("CourseViewer", {
      url: post.url,
      title: post.title,
      id: post.id,
    });
  };

  if (loading) return <SkeletonDetail />;

  if (error || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>🛑</Text>
        <Text style={[FONTS.h3, { marginBottom: 8 }]}>Something went wrong</Text>
        <Text style={[FONTS.body, { color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 40 }]}>
          {error ? "We couldn't load this post. Please check your connection." : "This post could not be found."}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isBookmarked = bookmarks.has(post.id);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
          <Text style={styles.navIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Details</Text>
        <TouchableOpacity
          onPress={() => toggleBookmark(post.id)}
          style={styles.navBtn}
        >
          <Text style={{ fontSize: 22 }}>{isBookmarked ? '🔖' : '🔖'}</Text>
          {!isBookmarked && <View style={styles.bookmarkOverlay} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <CourseImage uri={post.image || DEFAULT_IMAGE} style={styles.heroImage} />
          <View style={[styles.platformBadge, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.platformText}>{post.platform || "Other"}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Post Header */}
          <Text style={styles.title}>{post.title}</Text>

          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(post.authorName || 'U')[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{post.authorName}</Text>
              <Text style={styles.timeText}>{timeAgo(post.createdAt)}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statValue}>⭐ {post.rating?.toFixed(1) || '0.0'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>⌛ {post.duration || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Course</Text>
            <Text style={styles.description}>
              {post.description || "No description provided by the author."}
            </Text>
          </View>

          {post.learnings?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Key Learnings</Text>
              {post.learnings.map((item, index) => (
                <View key={index} style={styles.learningItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.learningText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {post.tags?.length > 0 && (
            <View style={styles.tagsContainer}>
              {post.tags.map((tag, index) => (
                <Text key={index} style={styles.tagText}>#{tag}</Text>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Discussion Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discussion ({comments.length})</Text>

            {/* Comment Input */}
            <View style={styles.commentInputRow}>
              <View style={styles.smallAvatar}>
                <Text style={styles.avatarText}>U</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Add a comment..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                onPress={() => handleAddComment()}
                disabled={!commentText.trim() || isSubmitting}
                style={[styles.postBtn, !commentText.trim() && styles.disabledBtn]}
              >
                <Text style={styles.postBtnText}>Post</Text>
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {comments.map((comment) => (
              <View key={comment._id} style={styles.commentContainer}>
                <View style={styles.commentHeader}>
                  <View style={styles.smallAvatar}>
                    <Text style={styles.avatarText}>{(comment.userId?.name || 'U')[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{comment.userId?.name || "Anonymous"}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>

                    <View style={styles.commentActions}>
                      <TouchableOpacity onPress={() => handleLikeComment(comment._id)} style={styles.commentActionBtn}>
                        <Text style={[styles.actionLabel, comment.likes?.includes(postId) && { color: COLORS.primary }]}>
                          ❤️ {comment.likesCount || 0}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setCommentText(`@${comment.userId?.name} `)} style={styles.commentActionBtn}>
                        <Text style={styles.actionLabel}>Reply</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
                    </View>

                    {/* Replies */}
                    {comment.replies?.map((reply) => (
                      <View key={reply._id} style={styles.replyContainer}>
                        <View style={styles.smallAvatar}>
                          <Text style={styles.avatarText}>{(reply.userId?.name || 'U')[0].toUpperCase()}</Text>
                        </View>
                        <View style={styles.commentBubble}>
                          <Text style={styles.commentAuthor}>{reply.userId?.name}</Text>
                          <Text style={styles.commentText}>{reply.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}

            {comments.length === 0 && (
              <Text style={styles.emptyText}>No comments yet. Be the first to start the discussion!</Text>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Bottom Button */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={styles.stickyFooter}
      >
        <PrimaryButton
          title={post.url ? "View Course Content" : "Link Unavailable"}
          onPress={handleOpenCourse}
          disabled={!post.url}
          style={styles.actionBtn}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Logic Helpers
  async function handleAddComment(parentId = null) {
    if (!commentText.trim() || isSubmitting) return;

    const tempId = "temp-" + Date.now();
    const tempComment = {
      _id: tempId,
      text: commentText.trim(),
      userId: { name: "You" },
      likesCount: 0,
      replies: [],
      createdAt: new Date(),
      isPending: true
    };

    // Optimistic UI Update
    setComments(prev => [tempComment, ...prev]);
    const originalText = commentText;
    setCommentText("");
    setIsSubmitting(true);

    try {
      const res = await api.addComment({
        postId,
        text: originalText.trim(),
        parentId
      });
      // Replace temp with real
      setComments(prev => prev.map(c => c._id === tempId ? res : c));
    } catch (err) {
      setComments(prev => prev.filter(c => c._id !== tempId));
      setCommentText(originalText);
      showToast("Failed to post comment", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLikeComment(id) {
    if (isLiking) return;
    setIsLiking(true);

    // Optimistic UI Update
    setComments(prev => prev.map(c => {
      if (c._id === id) {
        const isLiked = c.likes?.includes(postId); // Simplified logic for demo
        return { ...c, likesCount: isLiked ? c.likesCount - 1 : c.likesCount + 1 };
      }
      return c;
    }));

    try {
      await api.likeComment(id);
    } catch (err) {
      showToast("Action failed", "error");
      // Recovery logic here...
    } finally {
      setIsLiking(false);
    }
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  navBtn: { padding: 8 },
  navIcon: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  headerTitle: { ...FONTS.h3 },
  bookmarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 8,
  },
  scrollContent: { flexGrow: 1 },
  imageContainer: { width: '100%', height: 240, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  platformBadge: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    ...SHADOW.sm,
  },
  platformText: { color: COLORS.white, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  body: { padding: SPACING.xl },
  title: { ...FONTS.h2, marginBottom: SPACING.lg },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md
  },
  avatarText: { color: COLORS.white, fontWeight: 'bold' },
  authorName: { ...FONTS.bodyBold },
  timeText: { ...FONTS.small, color: COLORS.textMuted },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    ...SHADOW.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { ...FONTS.small, color: COLORS.textMuted, marginBottom: 4 },
  statValue: { ...FONTS.bodyBold, color: COLORS.primary },
  divider: { width: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.md },
  section: { marginBottom: SPACING.xxl },
  sectionTitle: { ...FONTS.h3, marginBottom: SPACING.md },
  description: { ...FONTS.body, color: COLORS.textSecondary, lineHeight: 24 },
  learningItem: { flexDirection: 'row', marginBottom: 6 },
  bullet: { color: COLORS.primary, fontWeight: 'bold', marginRight: 8 },
  learningText: { ...FONTS.body, color: COLORS.textSecondary, flex: 1 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  tagText: { color: COLORS.primary, marginRight: 12, marginBottom: 8, fontWeight: '600' },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOW.lg,
  },
  actionBtn: { borderRadius: RADIUS.lg },
  errorEmoji: { fontSize: 40, marginBottom: 16 },
  backBtn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: COLORS.primary, borderRadius: 8 },
  backBtnText: { color: COLORS.white, fontWeight: 'bold' },

  // Comment Styles
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  textInput: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 10, ...FONTS.body, fontSize: 14, marginRight: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
  postBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md },
  disabledBtn: { opacity: 0.5 },
  postBtnText: { color: COLORS.white, fontWeight: 'bold' },

  commentContainer: { marginBottom: SPACING.xl },
  commentHeader: { flexDirection: 'row' },
  commentContent: { flex: 1 },
  commentBubble: { backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.md, flex: 1 },
  commentAuthor: { ...FONTS.bodyBold, fontSize: 14, marginBottom: 4 },
  commentText: { ...FONTS.body, fontSize: 14, color: COLORS.textSecondary },

  commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  commentActionBtn: { marginRight: SPACING.lg },
  actionLabel: { ...FONTS.small, fontWeight: '600', color: COLORS.textMuted },
  commentTime: { ...FONTS.small, color: COLORS.textMuted, marginLeft: 'auto' },

  replyContainer: { flexDirection: 'row', marginTop: SPACING.md, paddingLeft: SPACING.xxl },
  emptyText: { ...FONTS.body, color: COLORS.textMuted, textAlign: 'center', marginTop: 20 }
});

export default PostDetailScreen;
