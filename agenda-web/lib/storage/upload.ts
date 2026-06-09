// ─── Upload de imagens para o Supabase Storage ───────────────────────────────
//
// Buckets: `service-images` e `business-logos` (públicos para leitura, escrita
// restrita ao próprio usuário — caminho TEM que começar com `${user.id}/`).

import { supabase } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type UploadKind = "service" | "logo";

const BUCKETS: Record<UploadKind, string> = {
  service: "service-images",
  logo: "business-logos",
};

export type UploadResult =
  | { ok: true; publicUrl: string; path: string }
  | { ok: false; error: string };

function safeExtension(filename: string, mime: string): string {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  if (fromName && /^[a-z0-9]{2,4}$/.test(fromName)) return fromName;
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Faz upload de uma imagem para o bucket do usuário e devolve a URL pública.
 * `subPath` é opcional — quando passado, deixa o caminho previsível (ex.:
 * `${user_id}/services/${serviceId}/imagem.jpg`). Sem ele usa timestamp único.
 */
export async function uploadImage(
  kind: UploadKind,
  file: File,
  userId: string,
  subPath?: string,
): Promise<UploadResult> {
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Imagem muito grande. Limite de 5 MB." };
  }
  if (file.type && !ACCEPTED_MIME.includes(file.type)) {
    return { ok: false, error: "Formato não aceito. Use JPG, PNG, WebP ou GIF." };
  }

  const ext = safeExtension(file.name, file.type);
  const stamp = Date.now();
  const safeSub = subPath ? subPath.replace(/^\/+|\/+$/g, "") : `${stamp}`;
  const path = `${userId}/${safeSub}.${ext}`;

  const bucket = BUCKETS[kind];
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext}`,
    cacheControl: "3600",
  });

  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  // Adiciona cache-buster pra refletir substituição imediata no UI
  const publicUrl = `${data.publicUrl}?v=${stamp}`;
  return { ok: true, publicUrl, path };
}

/** Remove o arquivo de Storage a partir da URL pública. Best-effort. */
export async function removeFromPublicUrl(
  kind: UploadKind,
  publicUrl: string | null | undefined,
): Promise<void> {
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
