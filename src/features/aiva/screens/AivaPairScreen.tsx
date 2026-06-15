import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

import { useAivaStore } from '../aiva.store';
import { AppShell } from '../components/AppShell';

export function AivaPairScreen() {
  const theme = useAppTheme();
  const { device, updateDevice } = useAivaStore();
  const [step, setStep] = useState<'idle' | 'scanning' | 'broadcasting' | 'connected'>(
    device.connected ? 'connected' : 'idle',
  );
  const [serverKey, setServerKey] = useState(device.serverKey);

  const startPair = () => {
    setStep('scanning');
    setTimeout(() => setStep('broadcasting'), 1100);
    setTimeout(() => {
      setStep('connected');
      updateDevice({ connected: true });
    }, 2400);
  };

  const save = () => {
    updateDevice({ serverKey, connected: true });
    setStep('connected');
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
          <View style={styles.statusBannerInner}>
            <View style={styles.statusRing}>
              <View style={[styles.statusRingOuter, { borderColor: theme.colors.brandGold + '40' }]} />
              <View style={[styles.statusRingInner, { backgroundColor: theme.colors.background, borderColor: theme.colors.textMuted + '20' }]}>
                <Ionicons
                  name={step === 'connected' ? 'checkmark' : 'flash'}
                  size={20}
                  color={step === 'connected' ? theme.colors.success : theme.colors.brandGold}
                />
              </View>
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: theme.colors.textMuted }]}>
                Status: {step === 'connected' ? 'Connected' : step === 'idle' ? 'Awaiting Signal' : 'Synchronizing'}
              </Text>
              <Text style={[styles.statusName, { color: theme.colors.text }]}>AIVA Lens V1</Text>
              <View style={styles.statusChips}>
                <View style={[styles.chip, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.textMuted + '15' }]}>
                  <Text style={[styles.chipText, { color: theme.colors.brandGold }]}>{device.battery}%</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.textMuted + '15' }]}>
                  <Text style={[styles.chipText, { color: theme.colors.brandGold }]}>STRONG</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.textMuted + '15' }]}>
                  <Text style={[styles.chipText, { color: theme.colors.textMuted }]}>32°C</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.pairingSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
          <View style={styles.pairingHeader}>
            <Text style={[styles.pairingTitle, { color: theme.colors.text }]}>Pairing Sequence</Text>
            <View style={[styles.pairingBadge, { borderColor: theme.colors.brandGold + '40' }]}>
              <Text style={[styles.pairingBadgeText, { color: theme.colors.brandGold }]}>
                {step === 'idle' ? 'Awaiting Signal' : step === 'connected' ? 'Connected' : 'Scanning...'}
              </Text>
            </View>
          </View>
          <View style={styles.steps}>
            <View style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: theme.colors.brandGold }]}>
                <Text style={[styles.stepNumText, { color: theme.colors.background }]}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.colors.textMuted }]}>
                Hold the <Text style={{ color: theme.colors.brandGold, fontWeight: '700' }}>Action Button</Text> on the right temple for 5 seconds until the LED pulses gold.
              </Text>
            </View>
            <View style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: theme.colors.textMuted + '30' }]}>
                <Text style={[styles.stepNumText, { color: theme.colors.text }]}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.colors.textMuted }]}>
                Wait for the &ldquo;AIVA_HOTSPOT_XXXX&rdquo; network to appear in your list below.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={startPair}
            disabled={step !== 'idle'}
            style={[styles.scanBtn, { backgroundColor: theme.colors.brandGold, opacity: step !== 'idle' ? 0.5 : 1 }]}
          >
            <Text style={[styles.scanBtnLabel, { color: theme.colors.background }]}>SCAN FOR DEVICES</Text>
          </Pressable>
        </View>

        <View style={[styles.networksSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
          <Text style={[styles.networksTitle, { color: theme.colors.text }]}>Networks</Text>
          <View style={[styles.networkItem, { backgroundColor: theme.colors.brandGold + '10', borderColor: theme.colors.brandGold + '30' }]}>
            <View>
              <Text style={[styles.networkName, { color: theme.colors.text }]}>AIVA_HOTSPOT_82</Text>
              <Text style={[styles.networkHint, { color: theme.colors.brandGold }]}>TAP TO CONNECT</Text>
            </View>
            <Ionicons name="ellipse" size={12} color={theme.colors.brandGold} />
          </View>
          <View style={[styles.networkItem, { opacity: 0.5 }]}>
            <Text style={[styles.networkName, { color: theme.colors.text }]}>Home_Network_5G</Text>
            <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textMuted} />
          </View>
          <View style={[styles.networkItem, { opacity: 0.5 }]}>
            <Text style={[styles.networkName, { color: theme.colors.text }]}>Starlink_A2</Text>
            <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textMuted} />
          </View>
          <Pressable style={[styles.refreshBtn, { borderColor: theme.colors.textMuted + '20' }]}>
            <Text style={[styles.refreshLabel, { color: theme.colors.textMuted }]}>REFRESH LIST</Text>
          </Pressable>
        </View>

        <View style={[styles.keySection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
          <Text style={[styles.keyTitle, { color: theme.colors.text }]}>Neural Interface Key</Text>
          <Text style={[styles.keyDesc, { color: theme.colors.textMuted }]}>
            Provide your API access key to enable real-time object recognition and telemetry data streaming.
          </Text>
          <View style={styles.keyInputRow}>
            <TextInput
              value={serverKey}
              onChangeText={setServerKey}
              placeholder="ENTER SERVER KEY"
              placeholderTextColor={theme.colors.textMuted + '60'}
              style={[styles.keyInput, { color: theme.colors.brandGold, borderBottomColor: theme.colors.textMuted + '30' }]}
            />
            <Pressable onPress={save} style={[styles.verifyBtn, { backgroundColor: theme.colors.textMuted + '30' }]}>
              <Text style={[styles.verifyLabel, { color: theme.colors.text }]}>VERIFY</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.telemetryGrid}>
          <View style={[styles.telemetryItem, { borderLeftColor: theme.colors.textMuted + '30' }]}>
            <Text style={[styles.telemetryLabel, { color: theme.colors.textMuted }]}>CPU LOAD</Text>
            <Text style={[styles.telemetryValue, { color: theme.colors.brandGold }]}>12%</Text>
          </View>
          <View style={[styles.telemetryItem, { borderLeftColor: theme.colors.textMuted + '30' }]}>
            <Text style={[styles.telemetryLabel, { color: theme.colors.textMuted }]}>LATENCY</Text>
            <Text style={[styles.telemetryValue, { color: theme.colors.brandGold }]}>42ms</Text>
          </View>
          <View style={[styles.telemetryItem, { borderLeftColor: theme.colors.textMuted + '30' }]}>
            <Text style={[styles.telemetryLabel, { color: theme.colors.textMuted }]}>STORAGE</Text>
            <Text style={[styles.telemetryValue, { color: theme.colors.text }]}>128/512GB</Text>
          </View>
          <View style={[styles.telemetryItem, { borderLeftColor: theme.colors.textMuted + '30' }]}>
            <Text style={[styles.telemetryLabel, { color: theme.colors.textMuted }]}>FIRMWARE</Text>
            <Text style={[styles.telemetryValue, { color: theme.colors.text }]}>v{device.firmware}</Text>
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 20 },
  statusBanner: { padding: 20, borderRadius: 4, borderWidth: 1 },
  statusBannerInner: { flexDirection: 'row', gap: 20 },
  statusRing: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  statusRingOuter: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1 },
  statusRingInner: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusInfo: { flex: 1, gap: 8, justifyContent: 'center' },
  statusLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  statusName: { fontSize: 18, fontWeight: '700' },
  statusChips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '600' },
  pairingSection: { padding: 20, borderRadius: 4, borderWidth: 1, gap: 20 },
  pairingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pairingTitle: { fontSize: 18, fontWeight: '600' },
  pairingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pairingBadgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  steps: { gap: 16 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 14, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 20 },
  scanBtn: { paddingVertical: 14, borderRadius: 4, alignItems: 'center' },
  scanBtnLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  networksSection: { padding: 20, borderRadius: 4, borderWidth: 1, gap: 12 },
  networksTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  networkItem: { padding: 14, borderRadius: 4, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  networkName: { fontSize: 14, fontWeight: '600' },
  networkHint: { fontSize: 10, marginTop: 2 },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  refreshBtn: { paddingVertical: 10, borderRadius: 4, borderWidth: 1, alignItems: 'center', marginTop: 4 },
  refreshLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  keySection: { padding: 20, borderRadius: 4, borderWidth: 1, gap: 12 },
  keyTitle: { fontSize: 18, fontWeight: '600' },
  keyDesc: { fontSize: 13, lineHeight: 20 },
  keyInputRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  keyInput: { flex: 1, height: 48, borderBottomWidth: 2, fontSize: 14, fontFamily: 'monospace', letterSpacing: 1 },
  verifyBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 4 },
  verifyLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  telemetryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  telemetryItem: { width: '50%', padding: 12, borderLeftWidth: 2, gap: 4 },
  telemetryLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  telemetryValue: { fontSize: 18, fontWeight: '700' },
});
