import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppShell } from '@/features/aiva/components/AppShell';
import { SoftSwitch } from '@/features/aiva/components/SoftSwitch';
import { defaultPackFor } from '@/features/aiva/play/play.packs';
import { allPacks, upsertCustomPack } from '@/features/aiva/play/play.storage';
import type { HuntItem, PlayPack, QuizItem, StoryNode } from '@/features/aiva/play/play.types';
import type { MainStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/theme/theme';

type Props = NativeStackScreenProps<MainStackParamList, 'PlayPackEditor'>;

function newHunt(kind: PlayPack['kind'], idx: number): HuntItem {
  const word = kind === 'cards' ? `Thẻ ${idx + 1}` : `Đồ ${idx + 1}`;
  return {
    id: `c-${Date.now()}-${idx}`,
    label: word,
    prompt: kind === 'cards' ? `Tìm thẻ ${word}.` : `Tìm ${word}.`,
    hint: word,
    aliases: [],
  };
}

function newQuiz(idx: number): QuizItem {
  return {
    id: `q-${Date.now()}-${idx}`,
    emoji: '❓',
    prompt: 'Câu hỏi',
    answers: ['A', 'B'],
    correctIndex: 0,
  };
}

function newStory(idx: number): StoryNode {
  return {
    id: idx === 0 ? 'start' : `n${idx}`,
    text: 'Lời kể…',
    choices: [],
    end: false,
  };
}

export function PlayPackEditorScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const kind = route.params.kind;
  const [title, setTitle] = useState('');
  const [packId, setPackId] = useState(`${kind}-custom`);
  const [items, setItems] = useState<HuntItem[]>([]);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [story, setStory] = useState<StoryNode[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void allPacks().then((packs) => {
      const pack = packs.find((p) => p.kind === kind) ?? defaultPackFor(kind);
      setPackId(pack.id.endsWith('-custom') ? pack.id : `${kind}-custom`);
      setTitle(pack.title);
      if (kind === 'quiz') setQuiz(pack.quiz?.length ? pack.quiz : [newQuiz(0)]);
      else if (kind === 'story') setStory(pack.story?.length ? pack.story : [newStory(0)]);
      else setItems(pack.items?.length ? pack.items : [newHunt(kind, 0)]);
    });
  }, [kind]);

  const field = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.muted}
      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
    />
  );

  const onSave = async () => {
    const pack: PlayPack = {
      id: packId,
      kind,
      title: title.trim() || defaultPackFor(kind).title,
    };
    if (kind === 'quiz') pack.quiz = quiz;
    else if (kind === 'story') {
      pack.story = story;
      pack.storyStartId = story[0]?.id ?? 'start';
    } else pack.items = items;
    await upsertCustomPack(pack);
    setSaved(true);
  };

  return (
    <AppShell showBack>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.colors.primary }]}>{t('play.customize')}</Text>
        <Text style={[styles.help, { color: theme.colors.textMuted }]}>{t(`play.editorHelp.${kind}`)}</Text>
        {field(title, setTitle, t('play.packTitle'))}

        {(kind === 'hunt' || kind === 'cards') &&
          items.map((item, idx) => (
            <View
              key={item.id}
              style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                #{idx + 1}
              </Text>
              {field(
                item.label,
                (v) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, label: v } : x))),
                t('play.labelField'),
              )}
              {field(
                item.prompt,
                (v) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, prompt: v } : x))),
                t('play.promptField'),
              )}
              <Pressable
                onPress={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                style={[styles.removeBtn, { backgroundColor: theme.colors.surface2 }]}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{t('play.removeItem')}</Text>
              </Pressable>
            </View>
          ))}

        {kind === 'quiz' &&
          quiz.map((q, idx) => (
            <View
              key={q.id}
              style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>#{idx + 1}</Text>
              {field(
                q.emoji,
                (v) => setQuiz((prev) => prev.map((x, i) => (i === idx ? { ...x, emoji: v } : x))),
                t('play.emojiField'),
              )}
              {field(
                q.prompt,
                (v) => setQuiz((prev) => prev.map((x, i) => (i === idx ? { ...x, prompt: v } : x))),
                t('play.questionField'),
              )}
              {field(
                q.answers.join(', '),
                (v) =>
                  setQuiz((prev) =>
                    prev.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            answers: v
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }
                        : x,
                    ),
                  ),
                t('play.answersField'),
              )}
              {field(
                String(q.correctIndex),
                (v) =>
                  setQuiz((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, correctIndex: Math.max(0, Number(v) || 0) } : x,
                    ),
                  ),
                t('play.correctIndexField'),
              )}
              <Pressable
                onPress={() => setQuiz((prev) => prev.filter((_, i) => i !== idx))}
                style={[styles.removeBtn, { backgroundColor: theme.colors.surface2 }]}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{t('play.removeItem')}</Text>
              </Pressable>
            </View>
          ))}

        {kind === 'story' &&
          story.map((node, idx) => (
            <View
              key={`${node.id}-${idx}`}
              style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>#{idx + 1}</Text>
              {field(
                node.id,
                (v) => setStory((prev) => prev.map((x, i) => (i === idx ? { ...x, id: v } : x))),
                t('play.storyIdField'),
              )}
              {field(
                node.text,
                (v) => setStory((prev) => prev.map((x, i) => (i === idx ? { ...x, text: v } : x))),
                t('play.storyTextField'),
              )}
              {field(
                node.choices.map((c) => `${c.label}>${c.nextId}`).join(', '),
                (v) =>
                  setStory((prev) =>
                    prev.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            choices: v
                              .split(',')
                              .map((s) => s.trim())
                              .filter((s) => s.includes('>'))
                              .map((s) => {
                                const [label, nextId] = s.split('>');
                                return { label: label.trim(), nextId: (nextId || '').trim() };
                              }),
                          }
                        : x,
                    ),
                  ),
                t('play.storyChoicesField'),
              )}
              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{t('play.storyEndField')}</Text>
                <SoftSwitch
                  value={Boolean(node.end)}
                  onValueChange={(end: boolean) => setStory((prev) => prev.map((x, i) => (i === idx ? { ...x, end } : x)))}
                  onColor={theme.colors.primary}
                  offColor={theme.colors.surface4}
                />
              </View>
              <Pressable
                onPress={() => setStory((prev) => prev.filter((_, i) => i !== idx))}
                style={[styles.removeBtn, { backgroundColor: theme.colors.surface2 }]}
              >
                <Text style={{ color: theme.colors.danger, fontWeight: '700' }}>{t('play.removeItem')}</Text>
              </Pressable>
            </View>
          ))}

        <Pressable
          onPress={() => {
            if (kind === 'quiz') setQuiz((prev) => [...prev, newQuiz(prev.length)]);
            else if (kind === 'story') setStory((prev) => [...prev, newStory(prev.length)]);
            else setItems((prev) => [...prev, newHunt(kind, prev.length)]);
          }}
          style={[styles.cta, { backgroundColor: theme.colors.surface2 }]}
        >
          <Text style={[styles.ctaLabel, { color: theme.colors.primary }]}>{t('play.addItem')}</Text>
        </Pressable>

        <Pressable onPress={() => void onSave()} style={[styles.cta, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.ctaLabel, { color: theme.colors.onPrimary }]}>{t('common.save')}</Text>
        </Pressable>
        {saved ? (
          <Pressable onPress={() => navigation.goBack()} style={[styles.cta, { backgroundColor: theme.colors.accent }]}>
            <Text style={[styles.ctaLabel, { color: theme.colors.onAccent }]}>{t('play.savedBack')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  help: { fontSize: 13, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  removeBtn: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cta: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { fontSize: 16, fontWeight: '700' },
});
