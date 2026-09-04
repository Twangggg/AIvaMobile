/* Gesture handlers need a mutable "latest props" bag; React Compiler lint forbids that pattern. */
/* eslint-disable react-hooks/refs */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';

import { useAppTheme } from '@/theme/theme';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  accentColor?: string;
  trackColor?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** Custom slider — no Pressable ripple, captures the drag so the page does not scroll. */
export function SoftSlider({
  value,
  min = 0,
  max = 100,
  onChange,
  onSlidingComplete,
  onDragStateChange,
  accentColor,
  trackColor,
}: Props) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const minRef = useRef(min);
  minRef.current = min;
  const maxRef = useRef(max);
  maxRef.current = max;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const completeRef = useRef(onSlidingComplete);
  completeRef.current = onSlidingComplete;
  const dragRef = useRef(onDragStateChange);
  dragRef.current = onDragStateChange;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const valueFromX = useCallback((x: number) => {
    const w = widthRef.current;
    const lo = minRef.current;
    const hi = maxRef.current;
    if (w <= 0) return valueRef.current;
    return Math.round(lo + (clamp(x, 0, w) / w) * (hi - lo || 1));
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) >= Math.abs(g.dy),
        onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (e) => {
          dragRef.current?.(true);
          onChangeRef.current(valueFromX(e.nativeEvent.locationX));
        },
        onPanResponderMove: (e) => {
          onChangeRef.current(valueFromX(e.nativeEvent.locationX));
        },
        onPanResponderRelease: (e) => {
          const next = valueFromX(e.nativeEvent.locationX);
          onChangeRef.current(next);
          completeRef.current?.(next);
          dragRef.current?.(false);
        },
        onPanResponderTerminate: () => {
          completeRef.current?.(valueRef.current);
          dragRef.current?.(false);
        },
      }),
    [valueFromX],
  );

  const fill = clamp(value - min, 0, max - min);
  const px = width > 0 ? (fill / (max - min || 1)) * width : 0;
  const color = accentColor || theme.colors.primary;

  return (
    <View style={styles.hit} onLayout={onLayout} {...pan.panHandlers} collapsable={false}>
      <View style={[styles.track, { backgroundColor: trackColor || theme.colors.surface4 }]}>
        <View style={[styles.fill, { width: px, backgroundColor: color }]} />
        <View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: clamp(px - 11, -2, Math.max(-2, width - 20)) }],
              backgroundColor: color,
              borderColor: theme.colors.surface,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 40, justifyContent: 'center' },
  track: { height: 6, borderRadius: 999, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999 },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
});
