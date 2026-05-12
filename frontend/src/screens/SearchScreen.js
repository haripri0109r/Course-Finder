import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import EmptyState from '../components/EmptyState';
import FilterChip from '../components/FilterChip';
import { showToast } from '../components/Toast';
import { useAppTheme } from '../context/ThemeContext';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

const RECENT_SEARCHES = ['React Native', 'Data Science', 'Figma Design'];
const TRENDING_TOPICS = [
  { id: 1, name: 'AI Engineering', count: 'Trending in tech' },
  { id: 2, name: 'Leadership', count: 'Popular with managers' },
  { id: 3, name: 'UI Systems', count: 'Design craft' },
];
const LEARNING_PATHS = [
  { id: 'lp1', title: 'Full‑stack Product Engineer', steps: 'Curated sequence · 12 milestones' },
  { id: 'lp2', title: 'Design Operations', steps: 'Enterprise workflow · 9 milestones' },
];
const RECOMMENDED_SKILLS = ['System Design', 'TypeScript', 'Analytics', 'Strategy'];
const PLATFORMS = ['All', 'Udemy', 'Coursera', 'YouTube', 'LinkedIn'];

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchHeader: {
      backgroundColor: colors.surface,
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      ...SHADOW.xs,
    },
    eyebrow: {
      ...FONTS.tiny,
      color: colors.accent,
      marginBottom: 4,
      letterSpacing: 1,
    },
    searchHeaderTitle: {
      ...FONTS.h2,
      color: colors.textPrimary,
      marginBottom: SPACING.sm,
      fontWeight: '800',
    },
    sub: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginBottom: SPACING.md,
    },
    chipScroll: {
      marginBottom: SPACING.sm,
      flexGrow: 0,
    },
    chipScrollInner: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSubtle,
      height: 46,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchFieldIcon: {
      fontSize: 18,
      marginRight: SPACING.sm,
      color: colors.textSecondary,
    },
    searchInput: {
      flex: 1,
      ...FONTS.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    cancelBtn: {
      marginLeft: SPACING.md,
    },
    cancelText: {
      ...FONTS.bodyBold,
      color: colors.accent,
      fontSize: 13,
    },
    discovery: {
      flex: 1,
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
      color: colors.textSecondary,
      paddingHorizontal: SPACING.xl,
      marginBottom: SPACING.md,
    },
    clearText: {
      ...FONTS.small,
      color: colors.accent,
      textTransform: 'none',
    },
    inlineList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: SPACING.xl,
    },
    recentChip: {
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS.full,
      marginRight: SPACING.sm,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW.xs,
    },
    recentChipText: {
      ...FONTS.small,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    skillChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      marginRight: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    skillChipText: {
      ...FONTS.small,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    topicContainer: {
      paddingHorizontal: SPACING.xl,
    },
    topicCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.md,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'space-between',
      ...SHADOW.xs,
    },
    topicDetails: {
      flex: 1,
    },
    topicLabel: {
      ...FONTS.bodyBold,
      color: colors.textPrimary,
      fontSize: 14,
    },
    topicStats: {
      ...FONTS.small,
      color: colors.textMuted,
      textTransform: 'none',
      marginTop: 4,
    },
    pathCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      marginBottom: SPACING.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...SHADOW.xs,
    },
    pathTitle: {
      ...FONTS.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    pathMeta: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 4,
    },
    listContainer: {
      paddingBottom: 120,
      paddingTop: SPACING.lg,
    },
  });
}

export default function SearchScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('All');

  const handleSearch = async (forceQuery = null) => {
    const searchTerm = forceQuery || query;
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      setHasSearched(true);
      const response = await api.get(
        `/courses/search?q=${encodeURIComponent(searchTerm)}`
      );
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
    <ScrollView style={styles.discovery} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={styles.discoverySection}>
        <View style={styles.rowHeader}>
          <Text style={styles.sectionTitle}>Recent searches</Text>
          <TouchableOpacity>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inlineList}>
          {RECENT_SEARCHES.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.recentChip}
              onPress={() => {
                setQuery(s);
                handleSearch(s);
              }}
            >
              <Text style={styles.recentChipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.discoverySection}>
        <Text style={styles.sectionTitle}>Skills to explore</Text>
        <View style={styles.inlineList}>
          {RECOMMENDED_SKILLS.map((skill) => (
            <TouchableOpacity
              key={skill}
              style={styles.skillChip}
              onPress={() => {
                setQuery(skill);
                handleSearch(skill);
              }}
            >
              <Text style={styles.skillChipText}>{skill}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.discoverySection}>
        <Text style={styles.sectionTitle}>Trending paths</Text>
        <View style={styles.topicContainer}>
          {TRENDING_TOPICS.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.topicCard}
              onPress={() => {
                setQuery(topic.name);
                handleSearch(topic.name);
              }}
            >
              <View style={styles.topicDetails}>
                <Text style={styles.topicLabel}>{topic.name}</Text>
                <Text style={styles.topicStats}>{topic.count}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.discoverySection}>
        <Text style={styles.sectionTitle}>Learning collections</Text>
        <View style={styles.topicContainer}>
          {LEARNING_PATHS.map((path) => (
            <TouchableOpacity key={path.id} style={styles.pathCard} activeOpacity={0.85}>
              <View style={{ flex: 1, paddingRight: SPACING.sm }}>
                <Text style={styles.pathTitle}>{path.title}</Text>
                <Text style={styles.pathMeta}>{path.steps}</Text>
              </View>
              <Ionicons name="layers-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const filteredResults =
    platformFilter === 'All'
      ? results
      : results.filter(
          (c) =>
            (c.platform || '').toLowerCase() === platformFilter.toLowerCase()
        );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.searchHeader}>
        <Text style={styles.eyebrow}>EXPLORE</Text>
        <Text style={styles.searchHeaderTitle}>Discover your next skill</Text>
        <Text style={styles.sub}>
          Search the catalog, filter by platform, and browse curated collections.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollInner}
        >
          {PLATFORMS.map((p) => (
            <FilterChip
              key={p}
              label={p}
              selected={platformFilter === p}
              onPress={() => setPlatformFilter(p)}
              colors={colors}
            />
          ))}
        </ScrollView>

        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Ionicons name="search-outline" style={styles.searchFieldIcon} />
            <TextInput
              style={[styles.searchInput, { outlineStyle: 'none' }]}
              placeholder="Courses, authors, skills…"
              placeholderTextColor={colors.textMuted}
              underlineColorAndroid="transparent"
              selectionColor={colors.accent}
              cursorColor={colors.accent}
              importantForAutofill="no"
              autoComplete="off"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              returnKeyType="search"
            />
          </View>
          {hasSearched && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setHasSearched(false);
                setResults([]);
              }}
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
        <View
          style={{
            flex: 1,
            paddingHorizontal: SPACING.xl,
            paddingTop: SPACING.lg,
          }}
        >
          <SkeletonCard />
          <View style={{ height: SPACING.md }} />
          <SkeletonCard />
          <View style={{ height: SPACING.md }} />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item, index) =>
            item?.id?.toString() ||
            item?._id?.toString() ||
            index.toString()
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: SPACING.xl }}>
              <CourseCard item={item} />
            </View>
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="No matches"
              subtitle={`Nothing for "${query}"${platformFilter !== 'All' ? ` on ${platformFilter}` : ''}. Try another keyword or platform.`}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
