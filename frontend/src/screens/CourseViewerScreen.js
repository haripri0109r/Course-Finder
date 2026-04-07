import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, SafeAreaView, Platform, Animated, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import api from '../services/api';
import PrimaryButton from '../components/PrimaryButton';
import { showToast } from '../components/Toast';
import { COLORS, SPACING, FONTS, SHADOW, RADIUS } from '../utils/theme';

export default function CourseViewerScreen({ route, navigation }) {
  const { url, title, courseId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // 1. Mark course as viewed (Atomic increment & Analytics)
    if (courseId) {
      api.incrementViewCount(courseId).catch(() => {});
    }

    // 2. Loading Shimmer Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [courseId]);

  // 6. CourseViewerScreen Safety
  if (!url) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No course URL available</Text>
      </View>
    );
  }

  const handleOpenBrowser = () => {
    if (!url) return;
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  const handleOpenNativeApp = async () => {
    if (!url) return;
    // Check if it's a YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
      const videoId = match ? match[1] : null;
      if (videoId) {
        const appUrl = `vnd.youtube://${videoId}`;
        const canOpen = await Linking.canOpenURL(appUrl);
        if (canOpen) {
          Linking.openURL(appUrl);
          return;
        }
      }
    }
    // Fallback to browser
    handleOpenBrowser();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header for WebView */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title || 'Course Viewer'}</Text>
          <Text style={styles.url} numberOfLines={1}>{url}</Text>
        </View>

        <TouchableOpacity onPress={handleOpenNativeApp} style={styles.browserBtn}>
          <Text style={styles.browserIcon}>{url.includes('youtube') ? '📺' : '🌐'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: url }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            showToast('Site restricted in app. Opening in browser...', 'info');
            // 7. WebView Fallback
            Linking.openURL(url).catch(() => {}); 
          }}
          allowsFullscreenVideo
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <Animated.View style={[styles.shimmerBox, { opacity }]} />
              <Animated.View style={[styles.shimmerText, { opacity }]} />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
    ...SHADOW.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  titleContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  title: {
    ...FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  url: {
    ...FONTS.small,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  browserBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  browserIcon: {
    fontSize: 20,
  },
  webviewContainer: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    padding: SPACING.xl,
  },
  shimmerBox: {
    height: 200,
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
  },
  shimmerText: {
    height: 20,
    width: '60%',
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
