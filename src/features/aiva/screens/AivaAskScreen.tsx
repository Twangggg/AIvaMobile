import { Ionicons } from '@expo/vector-icons';
import {
  type AudioPlayer,
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth/hooks';
import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

import { useAivaStore } from '../aiva.store';
import { AppShell } from '../components/AppShell';
import { type ChildProfile,getActiveChild } from '../services/children.storage';
import { type AiHealth,fetchAiHealth } from '../services/health.service';
import { queriesService } from '../services/queries.service';
import { evaluateSafetyGate, personaToAgentMode, recordUsageMinutes } from '../services/safety.policy';
import { type PersonaId } from '../services/safety.storage';
import { synthesizeSpeech } from '../services/tts.service';

export function AivaAskScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { isParent } = useAuth();
  const device = useAivaStore((s) => s.device);
  const addActivity = useAivaStore((s) => s.addActivity);
  const [thinking, setThinking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [inputMode, setInputMode] = useState<'glasses' | 'phone'>('phone');
  const [aiHealth, setAiHealth] = useState<AiHealth | null>(null);
  const [persona, setPersona] = useState<PersonaId>('robot');
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!device.connected) return;
    const timer = setTimeout(() => setInputMode('glasses'), 0);
    return () => clearTimeout(timer);
  }, [device.connected]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isParent) {
      void getActiveChild().then((c) => {
        if (cancelled) return;
        setChild(c);
        setPersona(c.persona);
      });
    } else {
      timer = setTimeout(() => {
        setChild(null);
        setPersona('mentor');
      }, 0);
    }

    void fetchAiHealth().then((health) => {
      if (!cancelled) setAiHealth(health);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      playerRef.current?.remove();
      playerRef.current = null;
    };
  }, [isParent]);

  const refreshHealth = useCallback(async () => {
    setAiHealth(await fetchAiHealth());
  }, []);

  const cloudId =
    device.cloudDeviceId && /^[0-9a-fA-F-]{36}$/.test(device.cloudDeviceId) ? device.cloudDeviceId : null;

  const childContext = child ? `Child: ${child.name}, age ${child.ageYears}` : '';

  const gateOrFail = async (action: 'ask' | 'capture' | 'voice') => {
    const gate = await evaluateSafetyGate(action);
    if (!gate.allowed) {
      setError(t(gate.messageKey));
      return false;
    }
    return true;
  };

  const applyResult = (result: {
    id: string;
    title: string;
    context: string;
    source: string;
    status: string;
    result: string | null;
    errorMessage: string | null;
    createdAt: string;
    aiOffline?: boolean;
    kind?: string;
  }) => {
    const offline = Boolean(result.aiOffline) || result.status === 'degraded';
    setDegraded(offline);
    setAnswer(result.result || result.errorMessage || t('ask.noAnswer'));
    addActivity({
      id: result.id,
      kind: (result.kind as 'question' | 'lookup' | 'camera') || 'question',
      title: result.title,
      context: result.context,
      source: result.source === 'glass' ? 'glass' : 'phone',
      status: result.status,
      result: result.result,
      at: new Date(result.createdAt).getTime(),
    });
    void recordUsageMinutes(1);
  };

  const playAnswer = async () => {
    if (!answer || degraded) {
      setError(t('ask.ttsNeedsAi'));
      return;
    }
    setSpeaking(true);
    setError(null);
    try {
      playerRef.current?.remove();
      const speech = await synthesizeSpeech(answer.slice(0, 800));
      if (!speech) {
        setError(t('ask.ttsFailed'));
        return;
      }
      const player = createAudioPlayer({ uri: speech.uri });
      playerRef.current = player;
      player.play();
    } catch {
      setError(t('ask.ttsFailed'));
    } finally {
      setSpeaking(false);
    }
  };

  const askText = useCallback(async () => {
    if (!(await gateOrFail('ask'))) return;
    const title = prompt.trim() || t('ask.defaultPrompt');
    setThinking(true);
    setAnswer(null);
    setError(null);
    setDegraded(false);
    try {
      const result = await queriesService.create({
        title,
        context: [inputMode === 'glasses' ? t('ask.contextGlasses') : t('ask.contextPhone'), childContext]
          .filter(Boolean)
          .join(' · '),
        kind: 'question',
        source: inputMode === 'glasses' ? 'glass' : 'phone',
        deviceId: cloudId,
        mode: personaToAgentMode(persona),
      });
      applyResult(result);
      setPrompt('');
      void refreshHealth();
    } catch {
      setError(t('ask.failed'));
    } finally {
      setThinking(false);
    }
  }, [childContext, cloudId, inputMode, persona, prompt, refreshHealth, t]);

  const pickImage = async (fromCamera: boolean) => {
    if (!(await gateOrFail('capture'))) return;
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('ask.cameraPermission'));
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
    if (result.canceled || !result.assets?.[0]) return;
    setImageUri(result.assets[0].uri);
  };

  const askWithImage = async () => {
    if (!imageUri) {
      setError(t('ask.needImage'));
      return;
    }
    if (!(await gateOrFail('capture'))) return;
    setThinking(true);
    setAnswer(null);
    setError(null);
    setDegraded(false);
    try {
      const result = await queriesService.createWithImage({
        uri: imageUri,
        title: prompt.trim() || t('ask.imagePrompt'),
        context: [t('ask.contextPhone'), childContext].filter(Boolean).join(' · '),
        kind: 'camera',
        source: 'phone',
        deviceId: cloudId,
        mode: personaToAgentMode(persona),
      });
      applyResult({ ...result, kind: 'camera' });
      setPrompt('');
      void refreshHealth();
    } catch {
      setError(t('ask.failed'));
    } finally {
      setThinking(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) return;
        if (!(await gateOrFail('voice'))) return;
        setThinking(true);
        setError(null);
        const transcript = await queriesService.transcribe(uri);
        if (transcript.offline || !transcript.text?.trim()) {
          setError(t('ask.sttOffline'));
          setThinking(false);
          return;
        }
        setPrompt(transcript.text.trim());
        const result = await queriesService.create({
          title: transcript.text.trim(),
          context: [t('ask.contextVoice'), childContext].filter(Boolean).join(' · '),
          kind: 'question',
          source: 'phone',
          deviceId: cloudId,
          mode: personaToAgentMode(persona),
        });
        applyResult(result);
      } catch {
        setError(t('ask.voiceFailed'));
      } finally {
        setThinking(false);
      }
      return;
    }

    if (!(await gateOrFail('voice'))) return;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError(t('ask.micPermission'));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      setError(null);
    } catch {
      setError(t('ask.voiceFailed'));
    }
  };

  return (
    <AppShell showBack>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('ask.askAi')}</Text>
        <Text style={[styles.sub, { color: theme.colors.textMuted }]}>
          {child ? t('ask.askingFor', { name: child.name }) : t('ask.cameraFeed')}
        </Text>

        {aiHealth && !aiHealth.ok ? (
          <View
            style={[
              styles.banner,
              { backgroundColor: alpha(theme.colors.accent, 0.12), borderColor: theme.colors.accent },
            ]}
          >
            <Text style={[styles.bannerTitle, { color: theme.colors.text }]}>{t('ask.aiOfflineTitle')}</Text>
            <Text style={[styles.bannerBody, { color: theme.colors.textMuted }]}>
              {aiHealth.hint || aiHealth.summary || t('ask.aiOfflineBody')}
            </Text>
            <Pressable onPress={refreshHealth} hitSlop={8}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{t('ask.retryHealth')}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.toggleRow}>
          {(['glasses', 'phone'] as const).map((mode) => {
            const active = inputMode === mode;
            const disabled = mode === 'glasses' && !device.connected;
            return (
              <Pressable
                key={mode}
                disabled={disabled}
                onPress={() => setInputMode(mode)}
                style={[
                  styles.toggle,
                  {
                    opacity: disabled ? 0.45 : 1,
                    borderColor: active ? theme.colors.text : theme.colors.borderStrong,
                    backgroundColor: active ? theme.colors.surface : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: active ? theme.colors.text : theme.colors.textMuted, fontSize: 14 }}>
                  {mode === 'glasses' ? t('ask.glasses') : t('ask.phone')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder={t('ask.promptPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
          style={[
            styles.input,
            {
              color: theme.colors.text,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        />

        <View style={styles.mediaRow}>
          <Pressable
            onPress={() => pickImage(true)}
            style={[styles.mediaBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Ionicons name="camera" size={18} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{t('ask.takePhoto')}</Text>
          </Pressable>
          <Pressable
            onPress={() => pickImage(false)}
            style={[styles.mediaBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            <Ionicons name="image" size={18} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{t('ask.pickPhoto')}</Text>
          </Pressable>
          <Pressable
            onPress={toggleRecording}
            style={[
              styles.mediaBtn,
              {
                borderColor: recording ? theme.colors.danger : theme.colors.border,
                backgroundColor: recording ? alpha(theme.colors.danger, 0.12) : theme.colors.surface,
              },
            ]}
          >
            <Ionicons
              name={recording ? 'stop' : 'mic'}
              size={18}
              color={recording ? theme.colors.danger : theme.colors.primary}
            />
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
              {recording ? t('ask.stopVoice') : t('ask.voice')}
            </Text>
          </Pressable>
        </View>

        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Pressable onPress={() => setImageUri(null)} hitSlop={8}>
              <Text style={{ color: theme.colors.danger }}>{t('ask.clearImage')}</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.status, { color: theme.colors.textMuted }]}>
          {thinking ? t('ask.processing') : answer ? t('ask.analysisComplete') : t('ask.searching')}
        </Text>

        <Pressable
          onPress={imageUri ? askWithImage : askText}
          disabled={thinking}
          style={[styles.askBtn, { backgroundColor: theme.colors.accent, opacity: thinking ? 0.7 : 1 }]}
        >
          {thinking ? (
            <ActivityIndicator color={theme.colors.onAccent} />
          ) : (
            <Text style={[styles.askBtnLabel, { color: theme.colors.onAccent }]}>
              {imageUri ? t('ask.askWithImage') : t('ask.askAi')}
            </Text>
          )}
        </Pressable>

        {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

        {answer ? (
          <View style={[styles.answerCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            {degraded ? (
              <Text style={[styles.degraded, { color: theme.colors.accent }]}>{t('ask.degradedBadge')}</Text>
            ) : null}
            <Text style={[styles.answerText, { color: theme.colors.text }]}>{answer}</Text>
            <Pressable
              onPress={playAnswer}
              disabled={speaking || degraded}
              style={[
                styles.speakBtn,
                { backgroundColor: theme.colors.primary, opacity: speaking || degraded ? 0.5 : 1 },
              ]}
            >
              {speaking ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="volume-high" size={16} color={theme.colors.onPrimary} />
                  <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>{t('ask.playAnswer')}</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 14 },
  title: { fontSize: 22, fontWeight: '600' },
  sub: { fontSize: 14, lineHeight: 20, marginTop: -6 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerBody: { fontSize: 13, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  toggle: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewWrap: { gap: 8 },
  preview: { width: '100%', height: 180, borderRadius: 12 },
  status: { fontSize: 13 },
  askBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
  },
  askBtnLabel: { fontSize: 16, fontWeight: '700' },
  answerCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  degraded: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  answerText: { fontSize: 15, lineHeight: 22 },
  speakBtn: {
    marginTop: 4,
    minHeight: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
