import { useNetInfo } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const netInfo = useNetInfo();
  return {
    isConnected: Boolean(netInfo.isConnected && netInfo.isInternetReachable !== false),
  };
}
