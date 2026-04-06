import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import { showToast } from '../components/Toast';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      setHasSearched(true);
      const response = await api.get(`/api/courses/search?q=${encodeURIComponent(query)}`);
      if (response.data.success) {
        setResults(response.data.courses);
      }
    } catch (error) {
      showToast('Could not fetch results. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBlock}>
        <Text style={styles.headline}>Explore</Text>
        <Text style={styles.subline}>Find courses by title, platform, or topic.</Text>
      </View>

      {/* Pill Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search courses..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
          <Text style={styles.searchBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <SkeletonCard count={4} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <CourseCard
              title={item.title}
              platform={item.platform}
              rating={item.averageRating}
              completions={item.totalCompletions}
              onPress={() => navigation.navigate('CourseDetail', { courseId: item._id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>😅</Text>
                <Text style={styles.emptyTitle}>No courses found</Text>
                <Text style={styles.emptySubtitle}>Try a different keyword or platform name.</Text>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🧭</Text>
                <Text style={styles.emptyTitle}>Start exploring</Text>
                <Text style={styles.emptySubtitle}>Type a keyword above to discover courses.</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.xl },
  headerBlock: { paddingTop: 56, marginBottom: SPACING.xl },
  headline: { ...FONTS.h1, marginBottom: SPACING.xs },
  subline: { ...FONTS.caption, fontSize: 15 },

  searchRow: { flexDirection: 'row', marginBottom: SPACING.xl, alignItems: 'center' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: SPACING.md,
  },
  searchIcon: { fontSize: 16, marginRight: SPACING.sm },
  input: { flex: 1, fontSize: 16, color: COLORS.textPrimary },
  searchBtn: {
    backgroundColor: COLORS.primary,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.lg,
  },
  searchBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },

  list: { paddingBottom: SPACING.xxxl },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { ...FONTS.h3, marginBottom: SPACING.xs },
  emptySubtitle: { ...FONTS.caption, fontSize: 15, textAlign: 'center' },
});
