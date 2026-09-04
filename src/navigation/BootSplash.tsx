import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions,View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAVY = '#001428';
const NAVY_MID = '#001428';
const GOLD = '#e8b34a';
const CYAN = '#7ee7ff';
const MIN_MS = 3400;

const PARTICLES = [
  { x: -148, y: -210, s: 2.5, delay: 0, dur: 2400 },
  { x: 132, y: -186, s: 3, delay: 180, dur: 2800 },
  { x: -88, y: 168, s: 2, delay: 320, dur: 2200 },
  { x: 118, y: 196, s: 2.5, delay: 90, dur: 2600 },
  { x: -176, y: 24, s: 2, delay: 410, dur: 3000 },
  { x: 172, y: -40, s: 3.5, delay: 140, dur: 2100 },
  { x: -40, y: -248, s: 2, delay: 260, dur: 2700 },
  { x: 48, y: 236, s: 2.5, delay: 500, dur: 2500 },
  { x: 0, y: -160, s: 1.8, delay: 80, dur: 1900 },
  { x: -120, y: 110, s: 2.2, delay: 360, dur: 2300 },
];

const LETTERS = ['A', 'I', 'V', 'A'];

type Props = {
  appReady: boolean;
  onReveal: () => void;
  onFinished: () => void;
};

function Particle({ x, y, s, delay, dur }: (typeof PARTICLES)[number]) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [delay, dur, t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.15, 0.85]),
    transform: [{ translateY: interpolate(t.value, [0, 1], [0, -18]) }, { scale: interpolate(t.value, [0, 1], [0.7, 1.15]) }],
  }));
  return (
    <Animated.View
      style={[styles.particle, { marginLeft: x, marginTop: y, width: s, height: s, borderRadius: s }, style]}
    />
  );
}

function Ring({ delay, size }: { delay: number; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }), -1, false)
    );
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.7, 1], [0.35, 0.12, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.45, 1.55]) }],
  }));
  return (
    <Animated.View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        },
        style,
      ]}
    />
  );
}

export function BootSplash({ appReady, onReveal, onFinished }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const overlay = useSharedValue(1);
  const stage = useSharedValue(0);
  const wipe = useSharedValue(0);
  const scan = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const floatY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const led = useSharedValue(0.2);
  const tag = useSharedValue(0);
  const letter0 = useSharedValue(0);
  const letter1 = useSharedValue(0);
  const letter2 = useSharedValue(0);
  const letter3 = useSharedValue(0);
  const letters = [letter0, letter1, letter2, letter3];

  useEffect(() => {
    void SplashScreen.hideAsync();
    stage.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    wipe.value = withDelay(280, withTiming(1, { duration: 920, easing: Easing.inOut(Easing.cubic) }));
    scan.value = withDelay(280, withTiming(1, { duration: 920, easing: Easing.inOut(Easing.cubic) }));
    shimmer.value = withDelay(
      1100,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, false)
    );
    floatY.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(6, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    tilt.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 1600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    led.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0.25, { duration: 780, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
    letters.forEach((item, i) => {
      item.value = withDelay(980 + i * 90, withSpring(1, { damping: 14, stiffness: 180, mass: 0.6 }));
    });
    tag.value = withDelay(1480, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [floatY, led, letter0, letter1, letter2, letter3, scan, shimmer, stage, tag, tilt, wipe]);

  useEffect(() => {
    if (!appReady) return;
    const t = setTimeout(() => {
      onReveal();
      overlay.value = withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinished)();
      });
    }, MIN_MS);
    return () => clearTimeout(t);
  }, [appReady, onFinished, onReveal, overlay]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: overlay.value,
  }));
  const markWrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(stage.value, [0, 1], [0.4, 1]),
    transform: [
      { perspective: 900 },
      { translateY: floatY.value },
      { rotateZ: `${tilt.value * 1.6}deg` },
      { scale: interpolate(stage.value, [0, 1], [0.86, 1]) },
    ],
  }));
  const wipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(wipe.value, [0, 1], [0, 280]) }],
  }));
  const scanStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scan.value, [0, 0.08, 0.92, 1], [0, 1, 1, 0]),
    transform: [{ translateY: interpolate(scan.value, [0, 1], [-8, 248]) }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-160, 240]) }, { rotateZ: '18deg' }],
    opacity: interpolate(shimmer.value, [0, 0.2, 0.65, 1], [0, 0.55, 0.25, 0]),
  }));
  const ledStyle = useAnimatedStyle(() => ({
    opacity: led.value,
    transform: [{ scale: interpolate(led.value, [0.25, 1], [0.75, 1.25]) }],
  }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: tag.value,
    transform: [{ translateY: interpolate(tag.value, [0, 1], [10, 0]) }],
  }));

  const visibleHeight = height - insets.top - insets.bottom;

  return (
    <Animated.View pointerEvents="auto" style={[styles.root, rootStyle]}>
      <View
        style={[
          styles.stage,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            height: height,
          },
        ]}
      >
        <View style={[styles.cluster, { height: visibleHeight }]}>
          <View style={styles.hero}>
            <View style={styles.fxAnchor} pointerEvents="none">
              {PARTICLES.map((p, i) => (
                <Particle key={i} {...p} />
              ))}
              <Ring delay={0} size={220} />
              <Ring delay={700} size={280} />
              <Ring delay={1400} size={340} />
            </View>
            <Animated.View style={[styles.markWrap, markWrapStyle]}>
              <View style={styles.markClip}>
                <Image source={require('../../assets/splash-mark.png')} style={styles.mark} />
                <Animated.View style={[styles.wipe, wipeStyle]} />
                <Animated.View style={[styles.scan, scanStyle]} />
                <Animated.View style={[styles.shimmer, shimmerStyle]} />
                <Animated.View style={[styles.led, ledStyle]} />
              </View>
            </Animated.View>
          </View>

          <View style={styles.wordmark}>
            {LETTERS.map((ch, i) => (
              <BootLetter key={`${ch}-${i}`} char={ch} progress={letters[i]!} />
            ))}
          </View>
          <Animated.Text style={[styles.tag, tagStyle]}>SEE  ·  ASK  ·  LEARN</Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

function BootLetter({
  char,
  progress,
}: {
  char: string;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [16, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.86, 1]) },
    ],
  }));
  return <Animated.Text style={[styles.letter, style]}>{char}</Animated.Text>;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: NAVY,
    zIndex: 100,
    elevation: 100,
  },
  stage: {
    width: '100%',
  },
  cluster: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: 248,
    height: 248,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fxAnchor: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: GOLD,
  },
  ring: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderWidth: 1,
    borderColor: 'rgba(126, 231, 255, 0.35)',
  },
  markWrap: {
    width: 248,
    height: 248,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markClip: {
    width: 248,
    height: 248,
    overflow: 'hidden',
    borderRadius: 36,
  },
  mark: {
    width: 248,
    height: 248,
  },
  wipe: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: NAVY_MID,
  },
  scan: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 2,
    backgroundColor: CYAN,
    shadowColor: CYAN,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  shimmer: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 46,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  led: {
    position: 'absolute',
    right: 54,
    top: 108,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  wordmark: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  letter: {
    color: '#f4f7ff',
    fontSize: 30,
    fontWeight: '300',
    letterSpacing: 6,
  },
  tag: {
    marginTop: 14,
    color: GOLD,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 4,
  },
});
