import React, { useState, useCallback } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

const PLACEHOLDER_URI = 'https://res.cloudinary.com/dk6uhtgvo/image/upload/v1/defaults/placeholder-course';

/**
 * Production-grade image component with:
 * - Loading skeleton
 * - Error fallback
 * - Layout stability (requires dimensions)
 * - Fade-in on load
 */
export default function CachedImage({
  uri,
  style,
  fallbackUri = PLACEHOLDER_URI,
  resizeMode = 'cover',
  borderRadius = 0,
  showLoader = true,
  ...props
}) {
  const { colors } = useAppTheme();
  const [status, setStatus] = useState('loading');
  const [currentUri, setCurrentUri] = useState(uri);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
  }, []);

  const handleError = useCallback(() => {
    if (currentUri !== fallbackUri) {
      setCurrentUri(fallbackUri);
      setStatus('loading');
    } else {
      setStatus('error');
    }
  }, [currentUri, fallbackUri]);

  const isLoading = status === 'loading';
  const isError = status === 'error';

  return (
    <View style={[styles.container, style, { borderRadius }]}>
      {!isError && (
        <Image
          source={{ uri: currentUri }}
          style={[styles.image, { borderRadius }, isLoading && styles.hidden]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {isLoading && showLoader && (
        <View style={[styles.loader, { backgroundColor: colors.surfaceSubtle, borderRadius }]}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      )}

      {isError && (
        <View style={[styles.errorFallback, { backgroundColor: colors.surfaceSubtle, borderRadius }]}>
          <View style={[styles.errorIcon, { borderColor: colors.border }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hidden: {
    opacity: 0,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    opacity: 0.3,
  },
});
