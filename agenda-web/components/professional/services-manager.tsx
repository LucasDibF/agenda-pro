"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import type { ServiceRow } from "@/types/domain";
import { useCurrentProfessional } from "@/lib/hooks/useCurrentProfessional";
import { useServices } from "@/lib/hooks/useServices";
import { removeFromPublicUrl, uploadImage } from "@/lib/storage/upload";

type ServiceFormState = {
  name: string;
  durationMinutes: string;
  price: string;
  description: string;
};

const initialFormState: ServiceFormState = {
  name: "",
  durationMinutes: "60",
  price: "",
  description: "",
};

export function ServicesManager() {
  const { data: user, error: userError, isLoading: userLoading } = useCurrentProfessional();
  const professionalId = user?.id ?? null;

  const {
    data: services = [],
    error: servicesError,
    isLoading: servicesLoading,
    mutate,
  } = useServices(professionalId);

  const [form, setForm] = useState<ServiceFormState>(initialFormState);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loading = userLoading || servicesLoading;
  const activeCount = useMemo(
    () => services.filter((service) => service.is_active).length,
    [services],
  );

  const resetFeedback = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handlePickImage = (event: ChangeEvent<HTMLInputElement>) => {
    resetFeedback();
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    setPendingImage(file);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(URL.createObjectURL(file));
  };

  const clearPendingImage = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingImage(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!professionalId) {
      setErrorMessage("Usuário não identificado. Faça login novamente.");
      return;
    }

    const durationMinutes = Number(form.durationMinutes);
    const parsedPrice = Number(form.price.replace(",", "."));

    if (!form.name.trim()) return setErrorMessage("Informe o nome do serviço.");
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0)
      return setErrorMessage("Duração inválida. Use um número em minutos.");
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0)
      return setErrorMessage("Valor inválido.");

    setSubmitting(true);

    try {
      // 1) Insert primeiro pra ter o ID
      const { data: inserted, error: insertError } = await supabase
        .from("services")
        .insert({
          professional_id: professionalId,
          name: form.name.trim(),
          duration_minutes: durationMinutes,
          price: parsedPrice,
          description: form.description.trim() || null,
          is_active: true,
        })
        .select("id, name, duration_minutes, price, description, image_url, is_active, created_at")
        .single();

      if (insertError || !inserted) throw insertError ?? new Error("Falha ao cadastrar.");

      let finalService = inserted as ServiceRow;

      // 2) Se tem imagem pendente, faz upload e atualiza
      if (pendingImage) {
        const result = await uploadImage("service", pendingImage, professionalId, `services/${inserted.id}/cover`);
        if (!result.ok) {
          // Não bloqueia: serviço criado, mas avisa que imagem falhou
          setSuccessMessage(`Serviço cadastrado, mas a imagem não pôde ser enviada: ${result.error}`);
        } else {
          const { error: updateError } = await supabase
            .from("services")
            .update({ image_url: result.publicUrl })
            .eq("id", inserted.id);
          if (!updateError) finalService = { ...finalService, image_url: result.publicUrl };
        }
      }

      await mutate((current = []) => [finalService, ...current], { revalidate: false });
      setForm(initialFormState);
      clearPendingImage();
      if (!successMessage) setSuccessMessage("Serviço cadastrado com sucesso.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao cadastrar serviço.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplaceImage = async (service: ServiceRow, file: File) => {
    if (!professionalId) return;
    resetFeedback();
    setUploadingId(service.id);

    const result = await uploadImage("service", file, professionalId, `services/${service.id}/cover`);
    if (!result.ok) {
      setErrorMessage(result.error);
      setUploadingId(null);
      return;
    }

    const { error: updateError } = await supabase
      .from("services")
      .update({ image_url: result.publicUrl })
      .eq("id", service.id);

    if (updateError) {
      setErrorMessage(updateError.message);
      setUploadingId(null);
      return;
    }

    await mutate(
      services.map((item) =>
        item.id === service.id ? { ...item, image_url: result.publicUrl } : item,
      ),
      { revalidate: false },
    );
    setSuccessMessage("Imagem atualizada.");
    setUploadingId(null);
  };

  const handleRemoveImage = async (service: ServiceRow) => {
    if (!professionalId || !service.image_url) return;
    resetFeedback();
    setUploadingId(service.id);

    await removeFromPublicUrl("service", service.image_url);
    const { error: updateError } = await supabase
      .from("services")
      .update({ image_url: null })
      .eq("id", service.id);

    if (updateError) {
      setErrorMessage(updateError.message);
      setUploadingId(null);
      return;
    }

    await mutate(
      services.map((item) => (item.id === service.id ? { ...item, image_url: null } : item)),
      { revalidate: false },
    );
    setSuccessMessage("Imagem removida.");
    setUploadingId(null);
  };

  const handleToggleActive = async (service: ServiceRow) => {
    resetFeedback();
    const nextActive = !service.is_active;
    await mutate(
      services.map((item) => (item.id === service.id ? { ...item, is_active: nextActive } : item)),
      { revalidate: false },
    );

    const { error } = await supabase
      .from("services")
      .update({ is_active: nextActive })
      .eq("id", service.id);

    if (error) {
      setErrorMessage(error.message);
      await mutate();
    }
  };

  const handleDelete = async (serviceId: string) => {
    resetFeedback();
    if (!professionalId) return setErrorMessage("Usuário não identificado.");

    const { count: linkedAppointments, error: linkedError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("service_id", serviceId);

    if (linkedError) return setErrorMessage(linkedError.message);

    if ((linkedAppointments ?? 0) > 0) {
      const { error: updateError } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", serviceId)
        .eq("professional_id", professionalId);

      if (updateError) return setErrorMessage(updateError.message);

      await mutate(
        services.map((item) => (item.id === serviceId ? { ...item, is_active: false } : item)),
        { revalidate: false },
      );
      setSuccessMessage("Serviço com agendamentos não pode ser excluído. Foi desativado.");
      return;
    }

    const target = services.find((s) => s.id === serviceId);
    if (target?.image_url) await removeFromPublicUrl("service", target.image_url);

    const previous = services;
    await mutate(services.filter((item) => item.id !== serviceId), { revalidate: false });

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId)
      .eq("professional_id", professionalId);

    if (error) {
      setErrorMessage(error.message);
      await mutate(previous, { revalidate: false });
      return;
    }
    setSuccessMessage("Serviço excluído.");
  };

  const displayError = userError?.message ?? servicesError?.message ?? errorMessage;

  if (loading) {
    return (
      <div className="elevated-card p-6">
        <p className="text-sm text-body-secondary">Carregando serviços...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="elevated-card p-5">
        <h2 className="title-display text-lg">Novo serviço</h2>
        <p className="mt-1 text-sm text-body-secondary">
          Cadastre nome, duração, valor, descrição e uma foto opcional.
        </p>

        <form onSubmit={handleCreateService} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="field-label">Nome do serviço</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="input-shell"
              placeholder="Ex: Manicure completa"
            />
          </label>

          <label className="space-y-1">
            <span className="field-label">Duração (minutos)</span>
            <input
              type="number"
              min={1}
              max={600}
              value={form.durationMinutes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
              }
              required
              className="input-shell"
            />
          </label>

          <label className="space-y-1">
            <span className="field-label">Valor (R$)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              required
              className="input-shell"
              placeholder="150.00"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="field-label">Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              className="input-shell"
              placeholder="Detalhes do atendimento, materiais, orientações..."
            />
          </label>

          {/* Upload de imagem */}
          <div className="md:col-span-2">
            <span className="field-label">Foto do serviço (opcional)</span>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]">
                {pendingPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingPreview} alt="Pré-visualização" className="h-full w-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-[var(--text-muted)]">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M3 17l5-4 4 3 4-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePickImage}
                  className="block text-xs text-body-secondary file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--accent-dark)] hover:file:bg-[var(--accent-softer)]"
                />
                {pendingImage ? (
                  <button
                    type="button"
                    onClick={clearPendingImage}
                    className="self-start text-xs font-semibold text-body-muted hover:text-[var(--ink-strong)] hover:underline"
                  >
                    Remover seleção
                  </button>
                ) : (
                  <p className="text-xs text-body-muted">JPG, PNG ou WebP — até 5 MB.</p>
                )}
              </div>
            </div>
          </div>

          {displayError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
              {displayError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-2">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
          >
            {submitting ? "Salvando..." : "Cadastrar serviço"}
          </button>
        </form>
      </div>

      <div className="elevated-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="title-display text-lg">Serviços cadastrados</h2>
          <span className="text-sm text-body-muted">
            {activeCount} ativos de {services.length}
          </span>
        </div>

        {services.length === 0 ? (
          <p className="mt-4 text-sm text-body-secondary">Nenhum serviço cadastrado ainda.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="muted-card flex gap-4 p-4"
              >
                {/* Thumb / upload */}
                <ServiceImageSlot
                  service={service}
                  busy={uploadingId === service.id}
                  onReplace={(file) => handleReplaceImage(service, file)}
                  onRemove={() => handleRemoveImage(service)}
                />

                <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-[var(--ink-strong)]">{service.name}</h3>
                    <p className="text-sm text-body-secondary">
                      {service.duration_minutes} min • R${" "}
                      {Number(service.price).toFixed(2).replace(".", ",")}
                    </p>
                    {service.description ? (
                      <p className="text-sm text-body-muted">{service.description}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(service)}
                      className="btn-soft px-3 py-2 text-xs"
                    >
                      {service.is_active ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(service.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Thumb com upload inline (componente local) ──────────────────────────────

function ServiceImageSlot({
  service,
  busy,
  onReplace,
  onRemove,
}: {
  service: ServiceRow;
  busy: boolean;
  onReplace: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col items-center gap-1">
      <label
        className="relative flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm transition hover:border-[var(--accent)]"
        aria-label="Trocar imagem do serviço"
      >
        {service.image_url ? (
          <Image
            src={service.image_url}
            alt={service.name}
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-[var(--text-muted)]">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="9" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3 17l5-4 4 3 4-5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        )}

        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] text-xs font-semibold text-[var(--accent-dark)]">
            …
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onReplace(file);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={busy}
        />
      </label>
      {service.image_url ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="text-[0.65rem] font-semibold text-body-muted hover:text-red-600 disabled:opacity-50"
        >
          Remover
        </button>
      ) : (
        <span className="text-[0.65rem] text-body-muted">Adicionar</span>
      )}
    </div>
  );
}
