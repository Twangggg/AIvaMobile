import { ENV } from '@/config/env';
import { useAuthStore } from '@/features/auth/auth.store';
import { apiClient } from '@/services/http/client';

export async function synthesizeSpeech(text: string): Promise<{ uri: string; contentType: string } | null> {
  const token = useAuthStore.getState().tokens?.accessToken;
  const base = (apiClient.defaults.baseURL || ENV.EXPO_PUBLIC_API_URL).replace(/\/$/, '');
  const res = await fetch(`${base}/api/ai/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || 'audio/wav';
  const blob = await res.blob();
  // React Native: convert via base64 data URI for expo-audio
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  // btoa may not exist on all RN; use base-64 package already in deps
  const { encode } = await import('base-64');
  const b64 = encode(binary);
  const uri = `data:${contentType};base64,${b64}`;
  return { uri, contentType };
}
