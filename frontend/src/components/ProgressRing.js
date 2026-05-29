import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppTheme } from '../context/ThemeContext';
import { FONTS } from '../utils/theme';

/**
 * ProgressRing — circular progress indicator using react-native-svg.
 * Renders a proper arc with rounded linecaps.
 */
export default function ProgressRing({
  progress = 0, // 0-100
  size = 64,
  strokeWidth = 5,
  showLabel = true,
  color,
  style,
}) {
  const { colors } = useAppTheme();
  const pct = Math.min(100, Math.max(0, progress));
  const ringColor = color || colors.accent;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.borderLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {showLabel && (
        <View style={[StyleSheet.absoluteFill, styles.labelContainer]}>
          <Text style={[FONTS.mono, { color: colors.textPrimary, fontSize: size * 0.22 }]}>
            {Math.round(pct)}
          </Text>
          <Text style={[FONTS.tiny, { color: colors.textMuted, fontSize: size * 0.12, marginTop: -1 }]}>
            %
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
