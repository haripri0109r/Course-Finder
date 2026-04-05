import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW } from '../utils/theme';

let toastRef = null;

export function setToastRef(ref) {
  toastRef = ref;
}

export function showToast(message, type = 'success', duration = 2500) {
  if (toastRef) toastRef.show(message, type, duration);
}

export default function Toast() {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = React.useState(false);
  const [text, setText] = React.useState('');
  const [toastType, setToastType] = React.useState('success');
  const timer = useRef(null);

  const show = (message, type = 'success', duration = 2500) => {
    setText(message);
    setToastType(type);
    setVisible(true);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => hide(), duration);
  };

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  useEffect(() => {
    setToastRef({ show });
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const bg = {
    success: COLORS.secondary,
    error: '#EF4444',
    info: COLORS.primary,
    warning: '#F59E0B',
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bg[toastType] || bg.info, transform: [{ translateY }], opacity },
      ]}
    >
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity onPress={hide} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: SPACING.xl,
    right: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    ...SHADOW.md,
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1, marginRight: SPACING.sm },
  dismiss: { color: '#fff', fontSize: 16, fontWeight: '900', opacity: 0.8 },
});
