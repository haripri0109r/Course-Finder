import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW, FONTS } from '../utils/theme';

let toastRef = null;

export function setToastRef(ref) {
  toastRef = ref;
}

export const showToast = (data) => {
  if (!toastRef) {
    console.log("⚠️ Toast not ready yet");
    return;
  }
  toastRef.show(data);
};

export default function Toast() {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [toastType, setToastType] = useState('info');
  const timer = useRef(null);

  useEffect(() => {
    console.log("✅ Toast mounted");
    
    setToastRef({
      show: (data) => {
        setTitle(data.title || '');
        setMessage(data.message || '');
        setToastType(data.type || 'info');
        setVisible(true);
        
        Animated.parallel([
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        if (timer.current) clearTimeout(timer.current);
        const duration = data.duration || 3000;
        timer.current = setTimeout(() => hide(), duration);
      }
    });

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

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
      <View style={styles.textContainer}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
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
  textContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    color: '#fff', 
    fontWeight: '800', 
    fontSize: 15,
    marginBottom: 2,
  },
  message: { 
    color: '#fff', 
    fontWeight: '500', 
    fontSize: 13,
  },
  dismiss: { color: '#fff', fontSize: 16, fontWeight: '900', opacity: 0.8 },
});
