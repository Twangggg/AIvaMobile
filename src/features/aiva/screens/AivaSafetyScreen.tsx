import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

import { AppShell } from '../components/AppShell';
import {
  type ChildProfile,
  loadChildrenState,
  removeChild,
  setActiveChild,
  upsertChild,
} from '../services/children.storage';
import {
  DEFAULT_SAFETY,
  loadSafetySettings,
  type PersonaId,
  type SafetySettings,
  saveSafetySettings,
} from '../services/safety.storage';

export function AivaSafetyScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const [settings, setSettings] = useState<SafetySettings>(DEFAULT_SAFETY);
  const [hydrated, setHydrated] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [activeChildId, setActiveChildId] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSafetySettings().then((s) => {
      setSettings(s);
      setHydrated(true);
    });
    loadChildrenState().then((s) => {
      setChildren(s.children);
      setActiveChildId(s.activeChildId);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveSafetySettings(settings);
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [settings, hydrated]);

  const patch = (partial: Partial<SafetySettings>) => setSettings((s) => ({ ...s, ...partial }));

  const personas: { id: PersonaId; icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; sub: string }[] = [
    {
      id: 'robot',
      icon: 'hardware-chip-outline',
      tint: theme.colors.primary,
      title: t('safety.personaRobot'),
      sub: t('safety.personaRobotSub'),
    },
    {
      id: 'bear',
      icon: 'book',
      tint: theme.colors.accent,
      title: t('safety.personaBear'),
      sub: t('safety.personaBearSub'),
    },
    {
      id: 'mentor',
      icon: 'school',
      tint: theme.colors.successDeep,
      title: t('safety.personaMentor'),
      sub: t('safety.personaMentorSub'),
    },
  ];

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageTitle, { color: theme.colors.primary }]}>{t('safety.title')}</Text>
        <Text style={[styles.pageSub, { color: theme.colors.textMuted }]}>{t('safety.subtitleParent')}</Text>

        <Text style={[styles.personaHeading, { color: theme.colors.text }]}>{t('safety.children')}</Text>
        <Text style={[styles.pageSub, { color: theme.colors.textMuted }]}>{t('safety.childrenHint')}</Text>
        {children.map((c) => {
          const active = c.id === activeChildId;
          return (
            <Pressable
              key={c.id}
              onPress={async () => {
                const next = await setActiveChild(c.id);
                setActiveChildId(next.activeChildId);
                patch({ persona: c.persona });
              }}
              style={[
                styles.personaCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.personaIcon, { backgroundColor: alpha(theme.colors.primary, 0.12) }]}>
                <Ionicons name="happy-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.personaTitle, { color: theme.colors.text }]}>{c.name}</Text>
                <Text style={[styles.personaSub, { color: theme.colors.textMuted }]}>
                  {t('safety.childAge', { age: c.ageYears })}
                </Text>
              </View>
              {children.length > 1 ? (
                <Pressable
                  hitSlop={8}
                  onPress={async () => {
                    const next = await removeChild(c.id);
                    setChildren(next.children);
                    setActiveChildId(next.activeChildId);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={async () => {
            const id = `child-${Date.now()}`;
            const profile: ChildProfile = {
              id,
              name: `${t('safety.childDefault')} ${children.length + 1}`,
              persona: settings.persona,
              ageYears: 7,
            };
            const next = await upsertChild(profile);
            setChildren(next.children);
            await setActiveChild(id);
            setActiveChildId(id);
          }}
          style={[styles.addChildBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        >
          <Ionicons name="add" size={18} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{t('safety.addChild')}</Text>
        </Pressable>

        <Text style={[styles.personaHeading, { color: theme.colors.text }]}>{t('safety.aiPersona')}</Text>
        {personas.map((p) => {
          const selected = settings.persona === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                patch({ persona: p.id });
                void (async () => {
                  const active = children.find((c) => c.id === activeChildId);
                  if (!active) return;
                  const next = await upsertChild({ ...active, persona: p.id });
                  setChildren(next.children);
                })();
              }}
              style={[
                styles.personaCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                  borderWidth: selected ? 2 : 1,
                  ...theme.shadows.card,
                },
              ]}
            >
              {selected ? (
                <View style={[styles.check, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
                </View>
              ) : null}
              <View style={[styles.personaIcon, { backgroundColor: alpha(p.tint, 0.15) }]}>
                <Ionicons name={p.icon} size={28} color={p.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.personaTitle, { color: theme.colors.text }]}>{p.title}</Text>
                <Text style={[styles.personaSub, { color: theme.colors.textMuted }]}>{p.sub}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: '600' },
  pageSub: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  personaHeading: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  personaCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    position: 'relative',
  },
  check: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaTitle: { fontSize: 16, fontWeight: '700' },
  personaSub: { fontSize: 13, marginTop: 2 },
  addChildBtn: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
