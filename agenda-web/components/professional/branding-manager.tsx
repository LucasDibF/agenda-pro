"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfessional } from "@/lib/hooks/useCurrentProfessional";
import { removeFromPublicUrl, uploadImage } from "@/lib/storage/upload";

type BrandingRow = {
  logo_url: string | null;
  business_name: string | null;
};

const fetchBranding = async ([, professionalId]: [string, string]): Promise<BrandingRow> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("logo_url, business_name")
    .eq("id", professionalId)
    .single();
  if (error) throw error;
  return (data ?? { logo_url: null, business_name: null }) as BrandingRow;
};

export function BrandingManager() {
  const { data: user } = useCurrentProfessional();
  const professionalId = user?.id ?? null;

  const { data, mutate } = useSWR(
    professionalId ? (["branding", professionalId] as const) : null,
    fetchBranding,
    { revalidateOnFocus: false },
  );

  const remoteName = data?.business_name ?? "";
  const [businessName, setBusinessName] = useState(remoteName);
  const [lastSyncedName, setLastSyncedName] = useState(remoteName);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync controlado: quando o valor remoto mudar (carregamento ou save), reflete
  // no input — padrão recomendado pelo React 19 (em vez de useEffect).
  if (remoteName !== lastSyncedName) {
    setLastSyncedName(remoteName);
    setBusinessName(remoteName);
  }

  const resetFeedback = () => {
    setError("");
    setSuccess("");
  };

  const handlePickLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!professionalId) return;
    resetFeedback();
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const result = await uploadImage("logo", file, professionalId, "logo");
    if (!result.ok) {
      setError(result.error);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ logo_url: result.publicUrl })
      .eq("id", professionalId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    await mutate({ ...(data ?? { business_name: null }), logo_url: result.publicUrl }, { revalidate: false });
    setSuccess("Logo atualizada.");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveLogo = async () => {
    if (!professionalId || !data?.logo_url) return;
    resetFeedback();
    setUploading(true);

    await removeFromPublicUrl("logo", data.logo_url);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ logo_url: null })
      .eq("id", professionalId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    await mutate({ ...(data ?? { business_name: null }), logo_url: null }, { revalidate: false });
    setSuccess("Logo removida.");
    setUploading(false);
  };

  const handleSaveName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!professionalId) return;
    resetFeedback();
    setSaving(true);

    const trimmed = businessName.trim() || null;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ business_name: trimmed })
      .eq("id", professionalId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    await mutate({ ...(data ?? { logo_url: null }), business_name: trimmed }, { revalidate: false });
    setSuccess("Nome da empresa salvo.");
    setSaving(false);
  };

  return (
    <article className="elevated-card p-5 md:col-span-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-body-secondary">Marca da sua agenda</h2>
          <p className="mt-1 text-xs text-body-muted">
            A logo e o nome aparecem no topo do seu link de agendamento público.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] shadow-sm">
            {data?.logo_url ? (
              <Image
                src={data.logo_url}
                alt="Logo da empresa"
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-[var(--text-muted)]">
                <path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12 3v18M3 7.5l9 4.5 9-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            )}
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-[var(--accent-dark)]">
                …
              </div>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-1">
            <label className="cursor-pointer text-xs font-semibold text-[var(--accent-dark)] hover:underline">
              {data?.logo_url ? "Trocar logo" : "Enviar logo"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePickLogo}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {data?.logo_url ? (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={uploading}
                className="text-[0.7rem] text-[var(--text-muted)] hover:text-red-600 disabled:opacity-50"
              >
                Remover
              </button>
            ) : (
              <p className="text-[0.7rem] text-[var(--text-muted)]">JPG/PNG até 5 MB</p>
            )}
          </div>
        </div>

        {/* Nome da empresa */}
        <form onSubmit={handleSaveName} className="flex flex-1 flex-col gap-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Nome da sua empresa
            </span>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Studio Aurora Beauty"
              className="input-shell"
              maxLength={80}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary self-start"
          >
            {saving ? "Salvando…" : "Salvar nome"}
          </button>

          {error ? <p className="callout-danger mt-1">{error}</p> : null}
          {success ? <p className="callout-success mt-1">{success}</p> : null}
        </form>
      </div>
    </article>
  );
}
