import { supabase } from '@/lib/supabase';

export type UploadInfo = {
  fileId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
};

export type LatestUploadResponse = {
  file: UploadInfo;
  url: string;
  analysis?: string;
};

export async function getLatestUpload(
  _baseURL: string,
  deviceId?: string,
): Promise<LatestUploadResponse | null> {
  try {
    let q = supabase
      .from('uploaded_files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (deviceId) q = q.eq('device_id', deviceId);
    const { data, error } = await q.maybeSingle();
    if (error || !data) return null;

    const row = data as {
      id: string;
      file_name: string;
      file_size: number;
      content_type: string;
      created_at: string;
      public_url?: string | null;
      storage_path: string;
      analysis_result?: string | null;
    };

    let url = row.public_url ?? '';
    if (!url && row.storage_path) {
      const { data: pub } = supabase.storage.from('captures').getPublicUrl(row.storage_path);
      url = pub.publicUrl;
    }

    return {
      file: {
        fileId: row.id,
        fileName: row.file_name,
        fileSize: row.file_size,
        contentType: row.content_type,
        uploadedAt: row.created_at,
      },
      url,
      analysis: row.analysis_result ?? undefined,
    };
  } catch {
    return null;
  }
}
