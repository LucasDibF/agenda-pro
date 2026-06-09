// ─── Upload de imagens para Supabase Storage (mobile) ────────────────────────
//
// Buckets: `service-images` e `business-logos`. Lê o arquivo escolhido pelo
// expo-image-picker via fetch + arrayBuffer (forma recomendada em RN).

import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";

export type UploadKind = "service" | "logo";

const BUCKETS: Record<UploadKind, string> = {
  service: "service-images",
  logo: "business-logos",
};

const MAX_BYTES = 5 * 1024 * 1024;

export type UploadResult =
  | { ok: true; publicUrl: string; path: string }
  | { ok: false; error: string };

function extFromUri(uri: string, mime: string | undefined | null): string {
  const last = uri.split("?")[0].split("#")[0];
  const fromUri = last.split(".").pop()?.toLowerCase() ?? "";
  if (fromUri && /^[a-z0-9]{2,4}$/.test(fromUri)) return fromUri;
  if (mime?.includes("png")) return "png";
  if (mime?.includes("webp")) return "webp";
  if (mime?.includes("gif")) return "gif";
  return "jpg";
}

/** Pede permissão e abre o picker da galeria. Retorna asset selecionado ou null. */
export async function pickImageFromLibrary(): Promise<ImagePicker.ImagePickerAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsEditing: true,
    aspect: [1, 1],
    exif: false,
  });

  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

/** Faz upload do asset escolhido. `subPath` ex.: `services/abc123/cover`. */
export async function uploadImageAsset(
  kind: UploadKind,
  asset: ImagePicker.ImagePickerAsset,
  userId: string,
  subPath?: string,
): Promise<UploadResult> {
  try {
    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
      return { ok: false, error: "Imagem muito grande. Limite de 5 MB." };
    }

    const response = await fetch(asset.uri);
    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      return { ok: false, error: "Falha ao ler a imagem." };
    }

    const mime = asset.mimeType ?? null;
    const ext = extFromUri(asset.uri, mime);
    const stamp = Date.now();
    const safeSub = subPath ? subPath.replace(/^\/+|\/+$/g, "") : `${stamp}`;
    const path = `${userId}/${safeSub}.${ext}`;
    const bucket = BUCKETS[kind];

    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
      upsert: true,
      contentType: mime ?? `image/${ext}`,
      cacheControl: "3600",
    });

    if (error) return { ok: false, error: error.message };

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { ok: true, publicUrl: `${data.publicUrl}?v=${stamp}`, path };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro ao enviar imagem." };
  }
}

export async function removeFromPublicUrl(kind: UploadKind, publicUrl: string | null) {
  if (!publicUrl) return;
  const bucket = BUCKETS[kind];
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  let path = publicUrl.slice(idx + marker.length);
  const qIdx = path.indexOf("?");
  if (qIdx !== -1) path = path.slice(0, qIdx);
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}
