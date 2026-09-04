import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  onColor: string;
  offColor: string;
  thumbOnColor?: string;
  thumbOffColor?: string;
};

/** One-state toggle — no native Switch ripple stacking with parent re-renders. */
export function SoftSwitch({ value, onValueChange, onColor, offColor, thumbOnColor, thumbOffColor }: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      hitSlop={6}
      android_ripple={{ color: 'transparent' }}
      style={[styles.track, { backgroundColor: value ? onColor : offColor }]}
    >
      <View
        style={[
          styles.thumb,
          {
            alignSelf: value ? 'flex-end' : 'flex-start',
            backgroundColor: value ? thumbOnColor || '#fff' : thumbOffColor || '#fff',
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
