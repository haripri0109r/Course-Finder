import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import RetryBox from '../components/RetryBox';
import { showToast } from '../components/Toast';
import { prefetchImages } from '../utils/prefetch';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function SavedScreen({ navigation }) {
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchBookmarks = async (isRefresh = false, signal = null) => {
    try {
      setError(null);
      if (!isRefresh && savedItems.length === 0) setLoading(true);
      const startTime = Date.now();
      
      const response = await api.getSavedCompletions({ signal });
      if (response.data.success) {
        const flatData = response.data.data;
        setSavedItems(flatData);
        prefetchImages(flatData);
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setError(err);
      showToast('Could not sync your library', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      fetchBookmarks(false, controller.signal);
      return () => controller.abort();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookmarks(true);
  };

  const handleBookmarkToggle = async (id) => {
    try {
      await toggleBookmark(id);
      // Immediately filter out if we just unbookmarked it
      setSavedItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      showToast('Interaction failed', 'error');
    }
  };

  const renderItem = ({ item }) => {
    if (loading) return <SkeletonCard />;
    
    // v1 Standardized Flat structure
    return (
      <CourseCard
        item={item}
        onBookmark={() => handleBookmarkToggle(item.id)}
        isBookmarked={true}
      />
    );
  };

  if (error && savedItems.length === 0) {
    return <RetryBox message="Error loading saved library" error={error} onRetry={() => fetchBookmarks(false)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
        <Text style={styles.subtitle}>Curated collection of saved learning logs</Text>
      </View>

      <FlatList
        data={loading ? [1, 2, 3] : savedItems}
        keyExtractor={(item, index) => loading ? `skel-${index}` : item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.primary} 
            colors={[COLORS.primary]} 
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🔖</Text>
              <Text style={styles.emptyTitle}>Library is empty</Text>
              <Text style={styles.emptySubtitle}>
                Bookmark interesting logs from the community feed to build your personal knowledge base!
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
  title: { ...FONTS.h1, color: COLORS.textPrimary },
  subtitle: { ...FONTS.caption, color: COLORS.textSecondary, marginTop: 4, fontSize: 13 },

  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: SPACING.md, opacity: 0.5 },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  emptySubtitle: { ...FONTS.caption, textAlign: 'center', color: COLORS.textSecondary, fontSize: 15, lineHeight: 22 },
});
