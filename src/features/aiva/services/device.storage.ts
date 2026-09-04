import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'aiva_last_device';

export type SavedDevice = {
  id: string;
  name: string;
  secretKey: string;
  cloudDeviceId?: string;
};

export async function loadSavedDevice(): Promise<SavedDevice | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDevice;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSavedDevice(device: SavedDevice): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(device));
}

export async function clearSavedDevice(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
