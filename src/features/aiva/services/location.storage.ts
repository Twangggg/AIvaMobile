import * as SecureStore from 'expo-secure-store';

export type SafeZone = {
  id: string;
  name: string;
  kind: 'home' | 'school' | 'custom';
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
};

export type LocationSettings = {
  zones: SafeZone[];
  lastKnown: { latitude: number; longitude: number; updatedAt: number } | null;
};

const STORAGE_KEY = 'aiva_location_settings';

export const DEFAULT_LOCATION: LocationSettings = {
  zones: [
    { id: 'home', name: 'Home', kind: 'home', latitude: null, longitude: null, radiusMeters: 150 },
    { id: 'school', name: 'School', kind: 'school', latitude: null, longitude: null, radiusMeters: 200 },
  ],
  lastKnown: null,
};

export async function loadLocationSettings(): Promise<LocationSettings> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_LOCATION;
    return { ...DEFAULT_LOCATION, ...(JSON.parse(raw) as Partial<LocationSettings>) };
  } catch {
    return DEFAULT_LOCATION;
  }
}

export async function saveLocationSettings(settings: LocationSettings): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
}
