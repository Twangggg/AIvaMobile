import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

import { useAivaStore } from '../aiva.store';
import { AppShell } from '../components/AppShell';

export function AivaAskScreen() {
  const theme = useAppTheme();
  const addActivity = useAivaStore((s) => s.addActivity);
  const [active, setActive] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'glasses' | 'phone'>('glasses');

  const ask = () => {
    setThinking(true);
    setAnswer(null);
    setTimeout(() => {
      const reply =
        'Identify market trends in this sector overview. "Analyzing document... Detected 12% YoY growth in renewable infrastructure with significant investment spikes in Q3."';
      setAnswer(reply);
      addActivity({
        kind: 'question',
        title: 'Đã hỏi bằng camera điện thoại',
        context: 'Văn phòng',
        source: 'phone',
      });
      setThinking(false);
    }, 1600);
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.viewfinder, { borderColor: theme.colors.textMuted + '20' }]}>
          <View style={styles.viewfinderInner}>
            <Ionicons name="camera-outline" size={48} color={theme.colors.textMuted + '40'} />
            <Text style={[styles.viewfinderHint, { color: theme.colors.textMuted }]}>
              Camera Feed Area
            </Text>
            <View style={styles.crosshair}>
              <View style={[styles.crossCornerTL, { borderColor: theme.colors.brandGold }]} />
              <View style={[styles.crossCornerTR, { borderColor: theme.colors.brandGold }]} />
              <View style={[styles.crossCornerBL, { borderColor: theme.colors.brandGold }]} />
              <View style={[styles.crossCornerBR, { borderColor: theme.colors.brandGold }]} />
              <View style={[styles.crossDot, { backgroundColor: theme.colors.brandGold }]} />
            </View>
          </View>
          {active && <View style={[styles.scanLine, { backgroundColor: theme.colors.brandGold }]} />}
        </View>

        <View style={styles.telemetryRow}>
          <Text style={[styles.telemetryText, { color: theme.colors.brandGold }]}>LAT: 37.7749° N</Text>
          <Text style={[styles.telemetryText, { color: theme.colors.textMuted }]}>LNG: 122.4194° W</Text>
          <Text style={[styles.telemetryText, { color: theme.colors.brandGold }]}>AI_SYNC: 98%</Text>
          <Text style={[styles.telemetryText, { color: theme.colors.textMuted }]}>BUFFER: 0.02ms</Text>
        </View>

        <View style={[styles.neuralCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
          <View style={styles.neuralHeader}>
            <Ionicons name="diamond-outline" size={16} color={theme.colors.brandGold} />
            <Text style={[styles.neuralTitle, { color: theme.colors.brandGold }]}>NEURAL ANALYSIS</Text>
          </View>
          <Text style={[styles.neuralStatus, { color: theme.colors.textMuted }]}>
            {thinking ? 'Processing...' : answer ? 'Analysis complete' : 'Searching for landmarks...'}
          </Text>
          <View style={[styles.neuralBar, { backgroundColor: '#353534' }]}>
            <View style={[styles.neuralBarFill, { backgroundColor: theme.colors.brandGold, width: thinking ? '60%' : answer ? '100%' : '30%' }]} />
          </View>
        </View>

        <View style={styles.inputToggleRow}>
          <Pressable
            onPress={() => setInputMode('glasses')}
            style={[
              styles.inputToggle,
              inputMode === 'glasses'
                ? { backgroundColor: theme.colors.brandGold }
                : { backgroundColor: 'transparent', borderColor: theme.colors.textMuted + '20', borderWidth: 1 },
            ]}
          >
            <Ionicons name="diamond-outline" size={18} color={inputMode === 'glasses' ? theme.colors.background : theme.colors.textMuted} />
            <Text style={[styles.inputToggleLabel, { color: inputMode === 'glasses' ? theme.colors.background : theme.colors.textMuted }]}>GLASSES</Text>
          </Pressable>
          <Pressable
            onPress={() => setInputMode('phone')}
            style={[
              styles.inputToggle,
              inputMode === 'phone'
                ? { backgroundColor: theme.colors.brandGold }
                : { backgroundColor: 'transparent', borderColor: theme.colors.textMuted + '20', borderWidth: 1 },
            ]}
          >
            <Ionicons name="contrast-outline" size={18} color={inputMode === 'phone' ? theme.colors.background : theme.colors.textMuted} />
            <Text style={[styles.inputToggleLabel, { color: inputMode === 'phone' ? theme.colors.background : theme.colors.textMuted }]}>PHONE</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setActive(true);
            ask();
          }}
          style={[styles.askBtn, { backgroundColor: theme.colors.brandGold }]}
        >
          <Ionicons name="sparkles" size={22} color={theme.colors.background} />
          <Text style={[styles.askBtnLabel, { color: theme.colors.background }]}>Ask AIVA AI</Text>
        </Pressable>

        {answer && (
          <View style={[styles.answerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12', borderLeftColor: theme.colors.brandGold }]}>
            <Text style={[styles.answerText, { color: theme.colors.text }]}>{answer}</Text>
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 20 },
  viewfinder: {
    height: 320,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  viewfinderInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  viewfinderHint: { fontSize: 14, opacity: 0.6 },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
  },
  crossCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  crossCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  crossCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  crossCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  crossDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: -3,
    marginTop: -3,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
  telemetryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  telemetryText: { fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5 },
  neuralCard: { padding: 16, borderRadius: 4, borderWidth: 1, gap: 10 },
  neuralHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  neuralTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  neuralStatus: { fontSize: 14 },
  neuralBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  neuralBarFill: { height: '100%', borderRadius: 2 },
  inputToggleRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  inputToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  inputToggleLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 4,
  },
  askBtnLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  answerCard: {
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderLeftWidth: 2,
  },
  answerText: { fontSize: 14, lineHeight: 22 },
});
