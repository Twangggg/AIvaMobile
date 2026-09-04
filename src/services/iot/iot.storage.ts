import * as SecureStore from 'expo-secure-store';

const KEY = 'aiva_iot_bot_url';

export async function loadIotBotUrl(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(KEY)) || '';
  } catch {
    return '';
  }
}

export async function saveIotBotUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, url);
}
