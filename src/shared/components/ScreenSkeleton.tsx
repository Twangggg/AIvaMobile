import { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const PULSE_DURATION = 1000;

function SkeletonBlock({ style }: { style?: object }) {
  const opacity = useMemo(() => new Animated.Value(0.3), []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: PULSE_DURATION, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: PULSE_DURATION, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

function SkeletonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function SkeletonCard({ style }: { style?: object }) {
  const opacity = useMemo(() => new Animated.Value(0.3), []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: PULSE_DURATION, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: PULSE_DURATION, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.card, style, { opacity }]} />;
}

export function ScreenSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <SkeletonBlock style={{ width: 80, height: 80, borderRadius: 12 }} />
        <SkeletonBlock style={{ width: '60%', height: 24 }} />
        <SkeletonBlock style={{ width: '40%', height: 16 }} />
      </View>

      <SkeletonRow>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </SkeletonRow>

      <View style={styles.section}>
        <SkeletonBlock style={{ width: '30%', height: 16 }} />
        <SkeletonRow>
          <SkeletonBlock style={{ flex: 1, height: 48 }} />
          <SkeletonBlock style={{ flex: 1, height: 48 }} />
          <SkeletonBlock style={{ flex: 1, height: 48 }} />
          <SkeletonBlock style={{ flex: 1, height: 48 }} />
        </SkeletonRow>
      </View>

      <View style={styles.section}>
        <SkeletonBlock style={{ width: '25%', height: 16 }} />
        <SkeletonBlock style={{ width: '100%', height: 80 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 24 },
  hero: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  row: { flexDirection: 'row', gap: 12 },
  block: { backgroundColor: '#2a2a2a', borderRadius: 6 },
  card: { flex: 1, height: 100, backgroundColor: '#2a2a2a', borderRadius: 6 },
  section: { gap: 12 },
});
