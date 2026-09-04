import { supabase } from '@/lib/supabase';
import { apiClient } from '@/services/http/client';
import { ApiError } from '@/services/http/errors';

export type QueryKind = 'question' | 'lookup' | 'camera';
export type QuerySource = 'glass' | 'phone';
export type AgentMode = 'child_companion' | 'vneid_guidance';

export type QueryRecord = {
  id: string;
  title: string;
  context: string;
  source: QuerySource;
  kind: QueryKind;
  status: string;
  result: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  aiOffline?: boolean;
};

export type CreateQueryPayload = {
  title: string;
  context: string;
  kind: QueryKind;
  source: QuerySource;
  deviceId?: string | null;
  mode?: AgentMode;
};

type QueryRow = {
  id: string;
  title: string;
  context: string;
  source: string;
  kind: string;
  status: string;
  result: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

function mapQuery(row: QueryRow, aiOffline?: boolean): QueryRecord {
  return {
    id: row.id,
    title: row.title,
    context: row.context,
    source: row.source as QuerySource,
    kind: row.kind as QueryKind,
    status: row.status,
    result: row.result,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    aiOffline,
  };
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError('Not authenticated', 401);
  return data.user.id;
}

async function completeWithAi(
  queryId: string,
  prompt: string,
  mode?: AgentMode,
): Promise<{ result: string; offline: boolean; detail?: string }> {
  try {
    const { data } = await apiClient.post<{
      result: string;
      offline?: boolean;
      detail?: string;
    }>('/api/ai/ask', { prompt, mode: mode ?? 'child_companion' }, { timeout: 180000 });
    return { result: data.result, offline: Boolean(data.offline), detail: data.detail };
  } catch (e) {
    const msg = (e as { message?: string })?.message ?? 'AI failed';
    return { result: msg, offline: true, detail: msg };
  }
}

export const queriesService = {
  async list(kind?: QueryKind) {
    let q = supabase.from('queries').select('*').order('created_at', { ascending: false });
    if (kind) q = q.eq('kind', kind);
    const { data, error } = await q;
    if (error) throw new ApiError(error.message, 400);
    return (data as QueryRow[]).map((row) => mapQuery(row));
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('queries').select('*').eq('id', id).single();
    if (error) throw new ApiError(error.message, 404);
    return mapQuery(data as QueryRow);
  },

  async create(payload: CreateQueryPayload) {
    const userId = await requireUserId();
    const { data: inserted, error } = await supabase
      .from('queries')
      .insert({
        user_id: userId,
        device_id: payload.deviceId || null,
        title: payload.title,
        context: payload.context,
        kind: payload.kind,
        source: payload.source,
        status: 'processing',
      })
      .select('*')
      .single();
    if (error) throw new ApiError(error.message, 400);

    const prompt = payload.context
      ? `${payload.title}\n\nContext: ${payload.context}`
      : payload.title;
    const ai = await completeWithAi(inserted.id, prompt, payload.mode);

    const { data: updated, error: upErr } = await supabase
      .from('queries')
      .update({
        status: ai.offline ? 'degraded' : 'completed',
        result: ai.result,
        error_message: ai.offline ? ai.detail ?? null : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)
      .select('*')
      .single();
    if (upErr) throw new ApiError(upErr.message, 400);
    return mapQuery(updated as QueryRow, ai.offline);
  },

  async createWithImage(params: {
    uri: string;
    fileName?: string;
    mimeType?: string;
    title?: string;
    context?: string;
    kind?: QueryKind;
    source?: QuerySource;
    deviceId?: string | null;
    mode?: AgentMode;
  }) {
    const userId = await requireUserId();
    const fileName = params.fileName ?? `capture-${Date.now()}.jpg`;
    const path = `${userId}/${fileName}`;

    const response = await fetch(params.uri);
    const blob = await response.blob();
    const { error: upError } = await supabase.storage.from('captures').upload(path, blob, {
      contentType: params.mimeType ?? 'image/jpeg',
      upsert: true,
    });
    if (upError) throw new ApiError(upError.message, 400);

    const { data: pub } = supabase.storage.from('captures').getPublicUrl(path);

    const { data: inserted, error } = await supabase
      .from('queries')
      .insert({
        user_id: userId,
        device_id: params.deviceId || null,
        title: params.title ?? 'Phone camera ask',
        context: params.context ?? '',
        kind: params.kind ?? 'camera',
        source: params.source ?? 'phone',
        status: 'processing',
        image_path: path,
      })
      .select('*')
      .single();
    if (error) throw new ApiError(error.message, 400);

    const form = new FormData();
    form.append('image', {
      uri: params.uri,
      name: fileName,
      type: params.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    form.append('mode', params.mode ?? 'child_companion');
    if (params.context) form.append('prompt', params.context);

    let ai: { result: string; offline: boolean; detail: string } = {
      result: '',
      offline: true,
      detail: 'AI failed',
    };
    try {
      const { data } = await apiClient.post<{
        result: string;
        offline?: boolean;
        detail?: string;
      }>('/api/ai/ask-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });
      ai = {
        result: data.result,
        offline: Boolean(data.offline),
        detail: data.detail ?? '',
      };
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'AI failed';
      ai = { result: msg, offline: true, detail: msg };
    }

    await supabase.from('uploaded_files').insert({
      user_id: userId,
      device_id: params.deviceId || null,
      query_id: inserted.id,
      file_name: fileName,
      content_type: params.mimeType ?? 'image/jpeg',
      file_size: blob.size,
      storage_path: path,
      public_url: pub.publicUrl,
      analysis_result: ai.result,
    });

    const { data: updated, error: upErr } = await supabase
      .from('queries')
      .update({
        status: ai.offline ? 'degraded' : 'completed',
        result: ai.result,
        error_message: ai.offline ? ai.detail ?? null : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', inserted.id)
      .select('*')
      .single();
    if (upErr) throw new ApiError(upErr.message, 400);
    return mapQuery(updated as QueryRow, ai.offline);
  },

  async transcribe(uri: string, fileName = 'voice.m4a', mimeType = 'audio/m4a') {
    const form = new FormData();
    form.append('audio', {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
    const { data } = await apiClient.post<{
      text: string;
      offline: boolean;
      detail?: string;
    }>('/api/ai/transcribe', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },
};
