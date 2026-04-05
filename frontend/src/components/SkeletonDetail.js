import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

export default function SkeletonDetail() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.shimmer, { width: '85%', height: 32, opacity, marginBottom: 12 }]} />
        <View style={styles.row}>
          <Animated.View style={[styles.shimmer, { width: 40, height: 40, borderRadius: 20, opacity, marginRight: 12 }]} />
          <View>
            <Animated.View style={[styles.shimmer, { width: 120, height: 14, opacity, marginBottom: 4 }]} />
            <Animated.View style={[styles.shimmer, { width: 80, height: 10, opacity }]} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.shimmer, { width: '100%', height: 24, opacity, marginBottom: 4 }]} />
        <Animated.View style={[styles.shimmer, { width: '90%', height: 24, opacity, marginBottom: 20 }]} />

        <View style={styles.row}>
          <Animated.View style={[styles.shimmer, { width: 80, height: 24, borderRadius: 12, opacity, marginRight: 8 }]} />
          <Animated.View style={[styles.shimmer, { width: 100, height: 24, borderRadius: 12, opacity }]} />
        </View>

        <View style={styles.divider} />

        <Animated.View style={[styles.shimmer, { width: '100%', height: 150, borderRadius: 12, opacity, marginBottom: 20 }]} />
        
        <View style={styles.box}>
          <View style={styles.row}>
            <Animated.View style={[styles.shimmer, { width: 30, height: 30, borderRadius: 15, opacity, marginRight: 12 }]} />
            <Animated.View style={[styles.shimmer, { width: '70%', height: 16, opacity }]} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.xl, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  content: { padding: SPACING.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  shimmer: { backgroundColor: '#E1E9EE', borderRadius: 4 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.xxl },
  box: { backgroundColor: COLORS.white, padding: SPACING.md, borderRadius: RADIUS.md },
});
