import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, StatusBar, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import { COLORS, SPACING, FONTS, RADIUS } from '../utils/theme';

const RECENT_SEARCHES = ['React Native', 'Data Science', 'Figma Design'];
const TRENDING_TOPICS = [
  { id: 1, name: 'Web3 Development', count: '1.2k learners' },
  { id: 2, name: 'AI Engineering', count: '850 learners' },
  { id: 3, name: 'UI/UX Fundamentals', count: '2k learners' },
];
const LEARNING_PATHS = [
  { id: 'lp1', title: 'Frontend Engineer Path', steps: '12 courses' },
  { id: 'lp2', title: 'Product Design Path', steps: '9 courses' },
];
const RECOMMENDED_SKILLS = ['System Design', 'TypeScript', 'Data Analytics', 'Product Strategy'];

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (forceQuery = null) => {
    const searchTerm = forceQuery || query;
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      setHasSearched(true);
      const response = await api.get(`/courses/search?q=${encodeURIComponent(searchTerm)}`);
      if (response.data.success) {
        setResults(response.data.courses);
      }
    } catch (error) {
      showToast({ message: 'Search failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const DiscoveryView = () => (
    <ScrollView style={styles.discovery} showsVerticalScrollIndicator={false}>
      <View style={styles.discoverySection}>
        <View style={styles.rowHeader}>
          <Text style={styles.sectionTitle}>Recent searches</Text>
          <TouchableOpacity>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inlineList}>
          {RECENT_SEARCHES.map((s) => (
            <TouchableOpacity key={s} style={styles.recentChip} onPress={() => { setQuery(s); handleSearch(s); }}>
              <Text style={styles.recentChipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.discoverySection}>
        <Text style={styles.sectionTitle}>Recommended skills</Text>
        <View style={styles.inlineList}>
          {RECOMMENDED_SKILLS.map((skill) => (
            <TouchableOpacity key={skill} style={styles.skillChip} onPress={() => { setQuery(skill); handleSearch(skill); }}>
              <Text style={styles.skillChipText}>{skill}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.discoverySection}>
        <Text style={styles.sectionTitle}>Trending technologies</Text>
        <View style={styles.topicContainer}>
          {TRENDING_TOPICS.map(topic => (
            <TouchableOpacity key={topic.id} style={styles.topicCard} onPress={() => { setQuery(topic.name); handleSearch(topic.name); }}>
              <View style={styles.topicDetails}>
                <Text style={styles.topicLabel}>{topic.name}</Text>
                <Text style={styles.topicStats}>{topic.count}</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.discoverySection}>
        <Text style={styles.sectionTitle}>Curated learning collections</Text>
        <View style={styles.topicContainer}>
          {LEARNING_PATHS.map((path) => (
            <TouchableOpacity key={path.id} style={styles.pathCard} activeOpacity={0.8}>
              <View>
                <Text style={styles.pathTitle}>{path.title}</Text>
                <Text style={styles.pathMeta}>{path.steps}</Text>
              </View>
              <Ionicons name="bookmark-outline" size={15} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.searchHeader}>
        <Text style={styles.searchHeaderTitle}>Search</Text>
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Ionicons name="search-outline" style={styles.searchFieldIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search anything..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
            />
          </View>
          {hasSearched && (
            <TouchableOpacity 
              onPress={() => { setQuery(''); setHasSearched(false); setResults([]); }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!hasSearched ? (
        <DiscoveryView />
      ) : loading ? (
        <View style={{ flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg }}>
          <SkeletonCard count={3} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => item?.id?.toString() || item?._id?.toString() || index.toString()}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: SPACING.xl }}>
              <CourseCard item={item} />
            </View>
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="○"
              title="No results found"
              subtitle={`We couldn't find anything for "${query || ''}".`}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  searchHeader: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchHeaderTitle: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    height: 44,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchFieldIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
    color: COLORS.textSecondary,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  cancelBtn: {
    marginLeft: SPACING.md,
  },
  cancelText: {
    ...FONTS.bodyBold,
    color: COLORS.accent,
    fontSize: 13,
  },
  discovery: { 
    flex: 1 
  },
  discoverySection: { 
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionTitle: { 
    ...FONTS.captionBold,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  clearText: {
    ...FONTS.small,
    color: COLORS.accent,
    textTransform: 'none',
  },
  inlineList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  recentChip: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    marginRight: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentChipText: { 
    ...FONTS.small,
    fontWeight: '600',
    color: COLORS.textSecondary 
  },
  skillChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
  },
  skillChipText: {
    ...FONTS.small,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  topicContainer: {
    paddingHorizontal: SPACING.xl,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  topicDetails: { 
    flex: 1,
  },
  topicLabel: { 
    ...FONTS.bodyBold, 
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  topicStats: { 
    ...FONTS.small, 
    color: COLORS.textMuted, 
    textTransform: 'none',
    marginTop: 2,
  },
  pathCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pathTitle: {
    ...FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  pathMeta: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContainer: { 
    paddingBottom: 100, 
    paddingTop: SPACING.lg 
  },
});
