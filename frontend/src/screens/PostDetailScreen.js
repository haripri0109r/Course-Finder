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
  Platform,
  StatusBar
} from 'react-native';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW, LAYOUT } from '../utils/theme';
import { DEFAULT_IMAGE } from '../config/constants';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedPressable from '../components/AnimatedPressable';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import CourseImage from '../components/CourseImage';
import { timeAgo } from '../utils/format';
import { showToast } from '../components/Toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const { bookmarks, toggleBookmark, user: currentUser } = useContext(AuthContext);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
          api.getComments(postId)
        ]);

        if (isMounted) {
          setPost(postData);
          setComments(commentsData);
          api.incrementViewCount(postId).catch(() => { });
        }
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => { isMounted = false; };
  }, [postId]);

  const handleOpenCourse = () => {
    if (!post?.url) return;
    navigation.navigate("CourseViewer", {
      url: post.url,
      title: post.title,
      id: post.id,
    });
  };

  const handleAddComment = async (parentId = null) => {
    if (!commentText.trim() || isSubmitting) return;

    const originalText = commentText;
    setCommentText("");
    setIsSubmitting(true);

    try {
      const res = await api.addComment({
        postId,
        text: originalText.trim(),
        parentId
      });
      setComments(prev => [res, ...prev]);
      showToast({ message: 'Comment shared!', type: 'success' });
    } catch (err) {
      setCommentText(originalText);
      showToast({ message: "Failed to post comment", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Detail unavailable</Text>
        <PrimaryButton title="Go Back" onPress={() => navigation.goBack()} variant="outline" size="sm" />
      </View>
    );
  }

  const isBookmarked = bookmarks.has(post.id);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.flex} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <CourseImage uri={post.image || DEFAULT_IMAGE} style={styles.heroImg} />
          <View style={styles.heroOverlay} />
          
          <SafeAreaView style={styles.heroNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
              <Text style={styles.navText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleBookmark(post.id)} style={styles.navBtn}>
              <Text style={{ fontSize: 20 }}>{isBookmarked ? '🔖' : '📑'}</Text>
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
          {/* Top Author Row */}
          <View style={styles.authorRow}>
            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: post.userId })}>
              <Avatar name={post.authorName} size="md" />
            </TouchableOpacity>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{post.authorName}</Text>
              <Text style={styles.authorMeta}>{timeAgo(post.createdAt)} • {post.duration || 'Short Course'}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {post.rating?.toFixed(1)}</Text>
            </View>
          </View>

          {/* About */}
          <Text style={styles.sectionTitle}>Course Insight</Text>
          <Text style={styles.insightText}>{post.description || "No additional insights shared."}</Text>

          {/* Learnings */}
          {post.learnings?.length > 0 && (
            <View style={styles.learningsContainer}>
              {post.learnings.map((l, i) => (
                <View key={i} style={styles.learningItem}>
                  <Text style={styles.learningCheck}>✓</Text>
                  <Text style={styles.learningText}>{l}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tags */}
          <View style={styles.tagRow}>
            {post.tags?.map((t, i) => (
              <Text key={i} style={styles.tagItem}>#{t}</Text>
            ))}
          </View>

          <View style={styles.separator} />

          {/* Discussion */}
          <SectionHeader title={`Discussion (${comments.length})`} style={styles.discHeader} />
          
          <View style={styles.inputArea}>
            <Avatar name={currentUser?.name} size="sm" />
            <TextInput
              style={styles.textInput}
              placeholder="Add a comment..."
              placeholderTextColor={COLORS.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity 
              onPress={() => handleAddComment()}
              disabled={!commentText.trim() || isSubmitting}
            >
              <Text style={[styles.postBtnText, commentText.trim() && { color: COLORS.accent }]}>Post</Text>
            </TouchableOpacity>
          </View>

          {/* Threaded Comments */}
          {comments.map((c) => (
            <View key={c._id} style={styles.commentRow}>
              <Avatar name={c.userId?.name} size="sm" />
              <View style={styles.commentBody}>
                <View style={styles.commentTop}>
                  <Text style={styles.commentAuthor}>{c.userId?.name || 'Learner'}</Text>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity><Text style={styles.actText}>Like</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setCommentText(`@${c.userId?.name} `)}><Text style={styles.actText}>Reply</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Persistent CTA */}
      <View style={styles.footer}>
        <PrimaryButton 
          title="Go to Course" 
          onPress={handleOpenCourse} 
          fullWidth 
          icon="🌐" 
          style={styles.cta}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  hero: { height: 400, backgroundColor: COLORS.primary },
  heroImg: { width: '100%', height: '100%', opacity: 0.6 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.3)' },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.xl, zIndex: 10 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', marginTop: Platform.OS === 'android' ? 10 : 0 },
  navText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  heroBody: { position: 'absolute', bottom: 40, left: SPACING.xl, right: SPACING.xl },
  platformChip: { alignSelf: 'flex-start', backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.xs, marginBottom: 12 },
  platformText: { ...FONTS.tiny, color: COLORS.white, fontSize: 10 },
  heroTitle: { ...FONTS.display, color: COLORS.white, fontSize: 28, lineHeight: 36 },
  mainContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, marginTop: -RADIUS.xxl, padding: SPACING.xl },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xxl },
  authorInfo: { flex: 1, marginLeft: SPACING.md },
  authorName: { ...FONTS.bodyBold, color: COLORS.primary },
  authorMeta: { ...FONTS.caption, color: COLORS.textMuted },
  ratingBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md },
  ratingText: { ...FONTS.captionBold, color: COLORS.accent },
  sectionTitle: { ...FONTS.label, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  insightText: { ...FONTS.body, color: COLORS.textPrimary, lineHeight: 24, marginBottom: SPACING.xxl },
  learningsContainer: { marginBottom: SPACING.xxl },
  learningItem: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  learningCheck: { color: COLORS.success, fontWeight: '800', marginRight: 12 },
  learningText: { ...FONTS.body, color: COLORS.textSecondary, flex: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING['3xl'] },
  tagItem: { ...FONTS.captionBold, color: COLORS.accent, marginRight: 12 },
  separator: { height: 1, backgroundColor: COLORS.borderLight, marginBottom: SPACING.xxl },
  discHeader: { marginBottom: SPACING.xl },
  inputArea: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING['3xl'] },
  textInput: { flex: 1, marginHorizontal: SPACING.md, ...FONTS.body, fontSize: 14, maxHeight: 80 },
  postBtnText: { ...FONTS.bodyBold, color: COLORS.border, fontSize: 14 },
  commentRow: { flexDirection: 'row', marginBottom: SPACING.xxl },
  commentBody: { flex: 1, marginLeft: SPACING.md },
  commentTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { ...FONTS.captionBold, color: COLORS.primary },
  commentTime: { ...FONTS.tiny, color: COLORS.textMuted, textTransform: 'none' },
  commentText: { ...FONTS.body, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  commentActions: { flexDirection: 'row', marginTop: 8 },
  actText: { ...FONTS.tiny, color: COLORS.textMuted, marginRight: 16, textTransform: 'none' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, padding: SPACING.xl, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl, borderTopWidth: 1, borderTopColor: COLORS.borderLight, ...SHADOW.lg },
  cta: { borderRadius: RADIUS.lg },
  errorEmoji: { fontSize: 40, marginBottom: 12 },
  errorTitle: { ...FONTS.h3, marginBottom: 20 },
});

export default PostDetailScreen;
