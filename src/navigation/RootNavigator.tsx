import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/hooks';
import { DeviceBridge } from '@/services/iot/device.bridge';

import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';
import { BootSplash } from './BootSplash';
import { MainStackNavigator } from './MainStackNavigator';

export function RootNavigator() {
  const { status, hydrated, bootstrap } = useAuth();
  const [appVisible, setAppVisible] = useState(false);
  const [cover, setCover] = useState(true);

  useEffect(() => {
    void bootstrap();
    void DeviceBridge.getShared().hydrate();
  }, [bootstrap]);

  const ready = hydrated && status !== 'idle';
  const onReveal = useCallback(() => setAppVisible(true), []);
  const onFinished = useCallback(() => setCover(false), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#001428' }}>
      {appVisible && ready ? (status === 'authenticated' ? <MainStackNavigator /> : <AuthNavigator />) : null}
      {cover ? <BootSplash appReady={ready} onReveal={onReveal} onFinished={onFinished} /> : null}
    </View>
  );
}

/** Kept for any import that still references the bare tab navigator. */
export { AppNavigator };
