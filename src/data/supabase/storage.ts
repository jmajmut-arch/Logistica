import { supabase } from '@/data/supabase/client';

const DISPATCH_GUIDES_BUCKET = 'dispatch-guides';

/** Sube el documento adjunto a una incidencia de guía de despacho y devuelve su URL pública. */
export async function uploadDispatchGuideFile(
  blob: Blob,
  fileName: string,
  mimeType: string | null,
): Promise<string> {
  const path = `${Date.now()}-${fileName}`;
  const { error } = await supabase.storage
    .from(DISPATCH_GUIDES_BUCKET)
    .upload(path, blob, { contentType: mimeType ?? undefined, upsert: false });
  if (error) throw error;
  const {
    data: { publicUrl },
  } = supabase.storage.from(DISPATCH_GUIDES_BUCKET).getPublicUrl(path);
  return publicUrl;
}
