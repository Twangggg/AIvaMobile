import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAivaStore } from '@/features/aiva/aiva.store';
import { AppShell } from '@/features/aiva/components/AppShell';
import { allPacks } from '@/features/aiva/play/play.storage';
import { currentPrompt, progressTotal, usePlayStore } from '@/features/aiva/play/play.store';
import type { MainStackParamList } from '@/navigation/types';
import { DeviceBridge } from '@/services/iot/device.bridge';
import type { PlayKind } from '@/services/iot/protocol';
import { showError } from '@/shared/utils/toast';
import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

type Props = NativeStackScreenProps<MainStackParamList, 'PlaySession'>;

function HowTo({ kind }: { kind: PlayKind }) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.howToHead} android_ripple={{ color: 'transparent' }}>
        <Text style={[styles.howToTitle, { color: theme.colors.textMuted }]}>{t('play.howToTitle')}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textMuted} />
      </Pressable>
      {open ? (
        <Text style={[styles.howToBody, { color: theme.colors.text }]}>{t(`play.howTo.${kind}`)}</Text>
      ) : null}
    </View>
  );
}

function friendlyBootError(raw: string, t: (k: string) => string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('no device') || lower.includes('not linked') || lower.includes('not connected')) {
    return t('play.needDeviceBody');
  }
  return raw.length > 120 ? t('play.needDeviceBody') : raw;
}

async function softOp(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // ignore mid-round device errors
  }
}

export function PlaySessionScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { kind, packId, mode } = route.params;
  const live = usePlayStore();
  const device = useAivaStore((s) => s.device);
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const phoneOnlyParam = Boolean(route.params.phoneOnly);
  const hadDevice = useRef(false);
  const warnedLost = useRef(false);

  useEffect(() => {
    const linked = device.connected || device.iotLinked;
    if (linked) {
      hadDevice.current = true;
      return;
    }
    if (hadDevice.current && !warnedLost.current && live.running && !live.finished) {
      warnedLost.current = true;
      usePlayStore.setState({ phoneOnly: true });
      showError(t('common.error'), t('play.deviceLost'));
    }
  }, [device.connected, device.iotLinked, live.running, live.finished, t]);

  useEffect(() => {
    let cancelled = false;
    let startedSessionId = '';
    void (async () => {
      try {
        const packs = await allPacks();
        const pack = packs.find((p) => p.id === packId) ?? packs.find((p) => p.kind === kind);
        if (!pack || cancelled) return;
        await usePlayStore.getState().start({ mode, pack, phoneOnly: phoneOnlyParam });
        if (cancelled) {
          const sid = usePlayStore.getState().sessionId;
          void usePlayStore.getState().stop({ sessionId: sid });
          return;
        }
        startedSessionId = usePlayStore.getState().sessionId;
      } catch (e) {
        if (!cancelled) setBootError(friendlyBootError((e as Error).message || '', t));
      }
    })();
    const unsub = DeviceBridge.getShared().onEvent((evt) => {
      if (evt.event === 'capture_match') {
        void usePlayStore.getState().onDeviceMatch(Boolean(evt.payload?.matched));
      }
      if (evt.event === 'session_timeout') {
        const sid = usePlayStore.getState().sessionId;
        void usePlayStore.getState().stop({ sessionId: sid });
        navigation.goBack();
      }
    });
    return () => {
      cancelled = true;
      unsub();
      const sid = startedSessionId || usePlayStore.getState().sessionId;
      if (sid) void usePlayStore.getState().stop({ sessionId: sid });
    };
  }, [kind, packId, mode, navigation, phoneOnlyParam, t]);

  const run = useCallback(
    async (fn: () => Promise<void>, opts?: { allowWhenFinished?: boolean }) => {
      if (busy || bootError) return;
      if (live.finished && !opts?.allowWhenFinished) return;
      setBusy(true);
      try {
        await fn();
      } finally {
        setBusy(false);
      }
    },
    [busy, live.finished, bootError],
  );

  const quiz = live.pack.quiz?.[live.index];
  const hunt = live.pack.items?.[live.index];
  const story = live.pack.story?.find((n) => n.id === live.storyNodeId);
  const prompt = currentPrompt(live);
  const total = progressTotal(live.pack);
  const showProgress = kind !== 'story' && total > 0;

  const showScoreButtons = useMemo(() => {
    if (kind === 'story' || live.finished || bootError) return false;
    if (live.mode === 'solo') return true;
    // Teams: show after device match, or always for quiz (teacher marks).
    if (kind === 'quiz') return true;
    return live.pendingMatch;
  }, [kind, live.finished, live.mode, live.pendingMatch, bootError]);

  const locked = Boolean(busy || live.finished || bootError);

  return (
    <AppShell showBack>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={[styles.kicker, { color: theme.colors.textMuted }]}>{t(`play.game.${kind}`)}</Text>
          {showProgress ? (
            <Text style={[styles.progress, { color: theme.colors.textMuted }]}>
              {t('play.progress', { current: live.index + 1, total })}
            </Text>
          ) : null}
        </View>

        <HowTo kind={kind} />

        <View style={styles.scoreRow}>
          {live.teams.map((team) => (
            <View
              key={team.id}
              style={[
                styles.scoreCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: live.turnTeamId === team.id ? theme.colors.accent : theme.colors.border,
                  ...theme.shadows.card,
                },
              ]}
            >
              <Text style={styles.emoji}>{team.emoji}</Text>
              {live.mode === 'teams' ? (
                <Text style={[styles.teamName, { color: theme.colors.text }]}>{team.name}</Text>
              ) : null}
              <Text style={[styles.stars, { color: theme.colors.primary }]}>{live.scores[team.id] ?? 0} ★</Text>
            </View>
          ))}
        </View>

        {live.rules.jarEnabled ? (
          <Text style={[styles.jar, { color: theme.colors.textMuted }]}>
            {t('play.jar', { stars: live.jarStars, goal: live.rules.jarGoal })}
          </Text>
        ) : null}

        {live.phoneOnly && !bootError ? (
          <Text style={[styles.hint, { color: theme.colors.warn }]}>{t('play.phoneOnlyHint')}</Text>
        ) : null}

        <Text style={[styles.prompt, { color: theme.colors.primary }]}>{prompt || live.lastMessage}</Text>

        {bootError ? (
          <View style={styles.errBlock}>
            <Text style={[styles.err, { color: theme.colors.danger }]}>{bootError}</Text>
            <Pressable
              onPress={() => navigation.navigate('Tabs', { screen: 'AivaPair' })}
              style={[styles.cta, { backgroundColor: theme.colors.accent }]}
            >
              <Text style={[styles.ctaLabel, { color: theme.colors.onAccent }]}>{t('play.goSettings')}</Text>
            </Pressable>
          </View>
        ) : null}

        {kind === 'quiz' && quiz ? (
          <View
            style={[
              styles.quizCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.card },
            ]}
          >
            {quiz.imageUri ? (
              <Image source={{ uri: quiz.imageUri }} style={styles.quizImg} resizeMode="contain" />
            ) : (
              <Text style={styles.quizEmoji}>{quiz.emoji}</Text>
            )}
            <Text style={[styles.teacherLabel, { color: theme.colors.textMuted }]}>{t('play.teacherAnswers')}</Text>
            <Text style={[styles.answers, { color: theme.colors.textMuted }]}>
              {quiz.answers.map((a, i) => (i === quiz.correctIndex ? `✓ ${a}` : a)).join(' · ')}
            </Text>
          </View>
        ) : null}

        {hunt && (kind === 'hunt' || kind === 'cards') ? (
          <Text style={[styles.hint, { color: theme.colors.textMuted }]}>
            {live.attempt === 2 ? hunt.hint : t('play.lookHint')}
          </Text>
        ) : null}

        {kind === 'story' && story && !live.finished ? (
          <View style={styles.actionsWrap}>
            {story.choices.map((c) => (
              <Pressable
                key={c.nextId}
                disabled={locked}
                onPress={() => run(() => live.chooseStory(c.nextId))}
                style={[styles.cta, { backgroundColor: theme.colors.accent, opacity: locked ? 0.5 : 1 }]}
              >
                <Text style={[styles.ctaLabel, { color: theme.colors.onAccent }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {live.finished ? (
          <View style={styles.doneBlock}>
            <Text style={[styles.done, { color: theme.colors.successDeep }]}>
              {live.winnerId
                ? t('play.winner', { name: live.teams.find((x) => x.id === live.winnerId)?.name ?? '' })
                : t('play.finished')}
            </Text>
            <Pressable
              onPress={() => run(() => live.restart(), { allowWhenFinished: true })}
              style={[styles.cta, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.ctaLabel, { color: theme.colors.onPrimary }]}>{t('play.playAgain')}</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.cta, { backgroundColor: theme.colors.surface2 }]}
            >
              <Text style={[styles.ctaLabel, { color: theme.colors.primary }]}>{t('play.backToGames')}</Text>
            </Pressable>
          </View>
        ) : null}

        {showScoreButtons ? (
          <View style={styles.actionsWrap}>
            {(kind === 'hunt' || kind === 'cards') && !live.phoneOnly ? (
              <Pressable
                disabled={locked}
                onPress={() => run(() => live.capture())}
                style={[styles.ctaPrimary, { backgroundColor: theme.colors.accent, opacity: locked ? 0.5 : 1 }]}
              >
                <Ionicons name="camera" size={22} color={theme.colors.onAccent} />
                <Text style={[styles.ctaLabel, { color: theme.colors.onAccent }]}>{t('play.capture')}</Text>
              </Pressable>
            ) : null}

            {live.mode === 'solo' ? (
              <Pressable
                disabled={locked}
                onPress={() => run(() => live.markCorrect(live.teams[0].id))}
                style={[styles.ctaPrimary, { backgroundColor: theme.colors.primary, opacity: locked ? 0.5 : 1 }]}
              >
                <Text style={[styles.ctaLabel, { color: theme.colors.onPrimary }]}>{t('play.correct')}</Text>
              </Pressable>
            ) : (
              live.teams.map((team) => (
                <Pressable
                  key={team.id}
                  disabled={locked}
                  onPress={() => run(() => live.markCorrect(team.id))}
                  style={[styles.cta, { backgroundColor: theme.colors.primary, opacity: locked ? 0.5 : 1 }]}
                >
                  <Text style={[styles.ctaLabel, { color: theme.colors.onPrimary }]}>
                    {t('play.correctFor', { name: team.name })}
                  </Text>
                </Pressable>
              ))
            )}

            <Pressable
              disabled={locked}
              onPress={() => run(() => live.markWrong())}
              style={[styles.cta, { backgroundColor: theme.colors.surface2, opacity: locked ? 0.5 : 1 }]}
            >
              <Text style={[styles.ctaLabel, { color: theme.colors.primary }]}>{t('play.wrong')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!live.finished && !bootError ? (
          <View style={styles.deviceRow}>
            <Pressable
              disabled={busy}
              onPress={() => run(() => live.speakAgain())}
              style={[styles.iconBtn, { backgroundColor: alpha(theme.colors.primary, 0.1) }]}
            >
              <Ionicons name="volume-high" size={20} color={theme.colors.primary} />
              <Text style={[styles.iconLbl, { color: theme.colors.primary }]}>{t('play.speakAgain')}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => run(() => softOp(() => DeviceBridge.getShared().quiet()))}
              style={[styles.iconBtn, { backgroundColor: alpha(theme.colors.primary, 0.1) }]}
            >
              <Ionicons name="pause" size={20} color={theme.colors.primary} />
              <Text style={[styles.iconLbl, { color: theme.colors.primary }]}>{t('play.quiet')}</Text>
            </Pressable>
            {!live.phoneOnly ? (
              <Pressable
                disabled={busy}
                onPress={() => run(() => softOp(() => DeviceBridge.getShared().find()))}
                style={[styles.iconBtn, { backgroundColor: alpha(theme.colors.accent, 0.2) }]}
              >
                <Ionicons name="locate" size={20} color={theme.colors.accentDim} />
                <Text style={[styles.iconLbl, { color: theme.colors.primary }]}>{t('play.find')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  progress: { fontSize: 14, fontWeight: '700' },
  howToHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
  howToTitle: { fontSize: 13, fontWeight: '600' },
  howToBody: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  prompt: { fontSize: 26, fontWeight: '700', lineHeight: 32 },
  err: { fontSize: 14, lineHeight: 20 },
  errBlock: { gap: 10 },
  scoreRow: { flexDirection: 'row', gap: 10 },
  scoreCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  emoji: { fontSize: 24 },
  teamName: { fontSize: 13, fontWeight: '700' },
  stars: { fontSize: 18, fontWeight: '800' },
  jar: { fontSize: 14, fontWeight: '600' },
  quizCard: { borderRadius: 24, borderWidth: 1, padding: 20, alignItems: 'center', gap: 8 },
  quizEmoji: { fontSize: 72, lineHeight: 88 },
  quizImg: { width: '100%', height: 180 },
  teacherLabel: { fontSize: 12, fontWeight: '600', alignSelf: 'flex-start' },
  answers: { fontSize: 14, fontWeight: '600', alignSelf: 'stretch' },
  hint: { fontSize: 14 },
  done: { fontSize: 18, fontWeight: '700' },
  doneBlock: { gap: 10 },
  actionsWrap: { gap: 10 },
  cta: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ctaPrimary: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  ctaLabel: { fontSize: 16, fontWeight: '700' },
  deviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  iconLbl: { fontSize: 13, fontWeight: '700' },
});
