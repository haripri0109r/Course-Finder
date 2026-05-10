import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Platform, SafeAreaView, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import RetryBox from '../components/RetryBox';
import EmptyState from '../components/EmptyState';
import SectionHeader from '../components/SectionHeader';
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
      
      const response = await api.getSavedCompletions({ signal });
      if (response.data.success) {
        const flatData = response.data.data;
        setSavedItems(flatData);
        prefetchImages(flatData);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(err);
        showToast({ message: 'Could not sync library', type: 'error' });
      }
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
      showToast({ message: 'Action failed', type: 'error' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <SectionHeader 
          title="Your Library" 
          subtitle="Curated collection of saved learning logs" 
          style={{ marginBottom: 0 }}
        />
      </View>

      <FlatList
        data={loading ? [1, 2, 3] : savedItems}
        keyExtractor={(item, index) => loading ? `skel-${index}` : item.id}
        renderItem={({ item }) => (
          loading ? (
            <SkeletonCard />
          ) : (
            <CourseCard
              item={item}
              onBookmark={() => handleBookmarkToggle(item.id)}
              isBookmarked={true}
            />
          )
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState 
              emoji="🔖"
              title="Library is empty"
              subtitle="Bookmark interesting logs from the feed to build your personal knowledge base!"
              actionTitle="Browse Feed"
              onAction={() => navigation.navigate('Home')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    paddingHorizontal: SPACING.xl, 
    paddingVertical: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  list: { paddingTop: SPACING.lg, paddingBottom: 40 },
});
