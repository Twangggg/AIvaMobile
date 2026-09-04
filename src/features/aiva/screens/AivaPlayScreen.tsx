import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAivaStore } from '@/features/aiva/aiva.store';
import { AppShell } from '@/features/aiva/components/AppShell';
import { SoftSwitch } from '@/features/aiva/components/SoftSwitch';
import { BUILTIN_PACKS } from '@/features/aiva/play/play.packs';
import { allPacks, loadScoreRules, saveScoreRules } from '@/features/aiva/play/play.storage';
import { usePlayStore } from '@/features/aiva/play/play.store';
import type { AppTabParamList, MainStackParamList } from '@/navigation/types';
import { DeviceBridge } from '@/services/iot/device.bridge';
import type { PlayKind } from '@/services/iot/protocol';
import { AlertModal } from '@/shared/components/AlertModal';
import { useAlert } from '@/shared/hooks/useAlert';
import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'AivaPlay'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const GAME_META: { kind: PlayKind; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: 'hunt', icon: 'search' },
  { kind: 'cards', icon: 'albums' },
  { kind: 'quiz', icon: 'image' },
  { kind: 'story', icon: 'book' },
];

const NEEDS_CAMERA: PlayKind[] = ['hunt', 'cards'];

export function AivaPlayScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const navigation = useNavigation<Nav>();
  const { alert, AlertModalProps } = useAlert();
  const device = useAivaStore((s) => s.device);
  const jarStars = usePlayStore((s) => s.jarStars);
  const rules = usePlayStore((s) => s.rules);
  const hydrateJar = usePlayStore((s) => s.hydrateJar);
  const [teamsMode, setTeamsMode] = useState(false);
  const [speedBonus, setSpeedBonus] = useState(true);
  const [jarOn, setJarOn] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    void DeviceBridge.getShared().hydrate();
    void hydrateJar();
    void loadScoreRules().then((r) => {
      setSpeedBonus(r.speedBonus);
      setJarOn(r.jarEnabled);
    });
  }, [hydrateJar]);

  const ready = device.connected || device.iotLinked;

  const deviceLabel = device.connected
    ? t('play.deviceBle')
    : device.iotLinked
      ? t('play.deviceBot')
      : t('play.deviceNone');

  const openGame = useCallback(
    async (kind: PlayKind) => {
      const needsCamera = NEEDS_CAMERA.includes(kind);
      if (needsCamera && !ready) {
        alert(t('play.needDeviceTitle'), t('play.needDeviceBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('play.goSettings'), onPress: () => navigation.navigate('AivaPair') },
        ]);
        return;
      }
      const packs = await allPacks();
      const pack = packs.find((p) => p.kind === kind) ?? BUILTIN_PACKS.find((p) => p.kind === kind);
      if (!pack) return;
      navigation.navigate('PlaySession', {
        kind,
        packId: pack.id,
        mode: teamsMode ? 'teams' : 'solo',
        phoneOnly: !ready,
      });
    },
    [alert, navigation, ready, t, teamsMode],
  );

  const persistRules = async (speed: boolean, jar: boolean) => {
    const current = await loadScoreRules();
    await saveScoreRules({ ...current, speedBonus: speed, jarEnabled: jar });
    await hydrateJar();
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>{t('play.title')}</Text>
        <Text style={[styles.sub, { color: theme.colors.textMuted }]}>{t('play.subtitle')}</Text>

        {GAME_META.map((g) => (
          <View
            key={g.kind}
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.card },
            ]}
          >
            <View style={styles.gameHead}>
              <View style={[styles.iconCircle, { backgroundColor: alpha(theme.colors.primary, 0.08) }]}>
                <Ionicons name={g.icon} size={22} color={theme.colors.primary} />
              </View>
              <Text style={[styles.gameTitle, { color: theme.colors.primary, flex: 1 }]}>{t(`play.game.${g.kind}`)}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => openGame(g.kind)}
                style={[styles.cta, styles.ctaFlex, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.ctaLabel, { color: theme.colors.onPrimary }]}>{t('play.start')}</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('PlayPackEditor', { kind: g.kind })}
                style={[styles.cta, styles.ctaFlex, { backgroundColor: theme.colors.surface2 }]}
              >
                <Text style={[styles.ctaLabel, { color: theme.colors.primary }]}>{t('play.customize')}</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.card },
          ]}
        >
          <View style={styles.row}>
            <View
              style={[styles.dot, { backgroundColor: ready ? theme.colors.successDeep : theme.colors.muted }]}
            />
            <Text style={[styles.rowText, { color: theme.colors.text }]}>{deviceLabel}</Text>
          </View>
          {!ready ? (
            <Pressable
              onPress={() => navigation.navigate('AivaPair')}
              style={[styles.cta, { backgroundColor: theme.colors.accent }]}
            >
              <Text style={[styles.ctaLabel, { color: theme.colors.onAccent }]}>{t('play.connectGlasses')}</Text>
            </Pressable>
          ) : null}

          {rules.jarEnabled ? (
            <Text style={[styles.jar, { color: theme.colors.primary }]}>
              {t('play.jar', { stars: jarStars, goal: rules.jarGoal })}
            </Text>
          ) : null}

          <Pressable onPress={() => setOptionsOpen((v) => !v)} style={styles.optionsToggle}>
            <Text style={[styles.optionsTitle, { color: theme.colors.text }]}>{t('play.optionsTitle')}</Text>
            <Ionicons
              name={optionsOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>

          {optionsOpen ? (
            <>
              <View style={[styles.modeRow, { backgroundColor: theme.colors.surface2 }]}>
                <Text style={[styles.modeLabel, { color: theme.colors.text }]}>{t('play.teamsMode')}</Text>
                <SoftSwitch
                  value={teamsMode}
                  onValueChange={setTeamsMode}
                  onColor={alpha(theme.colors.accent, 0.9)}
                  offColor={theme.colors.surface4}
                />
              </View>
              <View style={[styles.modeRow, { backgroundColor: theme.colors.surface2 }]}>
                <Text style={[styles.modeLabel, { color: theme.colors.text }]}>{t('play.speedBonus')}</Text>
                <SoftSwitch
                  value={speedBonus}
                  onValueChange={(v) => {
                    setSpeedBonus(v);
                    void persistRules(v, jarOn);
                  }}
                  onColor={alpha(theme.colors.accent, 0.9)}
                  offColor={theme.colors.surface4}
                />
              </View>
              <View style={[styles.modeRow, { backgroundColor: theme.colors.surface2 }]}>
                <Text style={[styles.modeLabel, { color: theme.colors.text }]}>{t('play.classJar')}</Text>
                <SoftSwitch
                  value={jarOn}
                  onValueChange={(v) => {
                    setJarOn(v);
                    void persistRules(speedBonus, v);
                  }}
                  onColor={alpha(theme.colors.accent, 0.9)}
                  offColor={theme.colors.surface4}
                />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      <AlertModal {...AlertModalProps} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '600' },
  sub: { fontSize: 14, marginTop: -8 },
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 14, fontWeight: '600', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  optionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  optionsTitle: { fontSize: 15, fontWeight: '700' },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modeLabel: { fontSize: 15, fontWeight: '600' },
  jar: { fontSize: 16, fontWeight: '700' },
  gameHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitle: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
  cta: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  ctaFlex: { flex: 1 },
  ctaLabel: { fontSize: 15, fontWeight: '700' },
});
