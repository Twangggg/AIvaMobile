import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'confirm';
};

type AlertConfig = {
  title: string;
  message: string;
  buttons?: AlertButton[];
};

export type { AlertButton,AlertConfig };

export function AlertModal({ visible, config, onClose }: { visible: boolean; config: AlertConfig | null; onClose: () => void }) {
  const theme = useAppTheme();
  if (!config) return null;

  const handlePress = (btn: AlertButton) => {
    if (btn.onPress) btn.onPress();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.card,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.colors.primary }]}>{config.title}</Text>
          <Text style={[styles.message, { color: theme.colors.textMuted }]}>{config.message}</Text>
          <View style={styles.buttons}>
            {config.buttons?.map((btn, i) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isConfirm = btn.style === 'confirm' || (!isCancel && !isDestructive);
              const bgColor = isDestructive
                ? theme.colors.danger
                : isConfirm
                  ? theme.colors.accent
                  : 'transparent';
              return (
                <Pressable
                  key={i}
                  onPress={() => handlePress(btn)}
                  style={[
                    styles.btn,
                    {
                      backgroundColor: bgColor,
                      borderColor: isCancel ? theme.colors.borderStrong : 'transparent',
                      borderWidth: isCancel ? 1 : 0,
                      borderRadius: theme.radii.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.btnLabel,
                      {
                        color: isCancel
                          ? theme.colors.textMuted
                          : isDestructive
                            ? theme.colors.onPrimary
                            : theme.colors.onAccent,
                      },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              );
            })}
            {(!config.buttons || config.buttons.length === 0) && (
              <Pressable
                onPress={onClose}
                style={[
                  styles.btn,
                  {
                    backgroundColor: theme.colors.accent,
                    borderWidth: 0,
                    borderRadius: theme.radii.md,
                  },
                ]}
              >
                <Text style={[styles.btnLabel, { color: theme.colors.onAccent }]}>OK</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    padding: 28,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 90,
    minHeight: 48,
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
