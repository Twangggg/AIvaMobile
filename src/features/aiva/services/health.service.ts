import { ENV } from '@/config/env';
import { apiClient } from '@/services/http/client';

export type AiHealth = {
  ok: boolean;
  summary: string;
  statusCode?: number | null;
  hint?: string;
};

export async function fetchAiHealth(): Promise<AiHealth> {
  try {
    const { data } = await apiClient.get<AiHealth>('/api/health/ai', { timeout: 4000 });
    return data;
  } catch {
    // Fall back to direct probe of configured API host root health
    try {
      const res = await fetch(`${ENV.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/health/ai`);
      if (!res.ok) {
        return { ok: false, summary: 'App backend health/ai failed', statusCode: res.status };
      }
      return (await res.json()) as AiHealth;
    } catch {
      return {
        ok: false,
        summary: 'Cannot reach app backend',
        hint: 'Start AIva.Api (port 8080). LLM can stay off for now.',
      };
    }
  }
}
