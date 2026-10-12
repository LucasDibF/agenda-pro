"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { BlockedTimeRow } from "@/types/domain";
import { toDatetimeLocal, formatDateTime } from "@/lib/utils/date";
import { useCurrentProfessional } from "@/lib/hooks/useCurrentProfessional";
import { useBlockedTimes } from "@/lib/hooks/useBlockedTimes";

type BlockedTimeFormState = {
  startAt: string;
  endAt: string;
  reason: string;
};

const now = new Date();
const initialFormState: BlockedTimeFormState = {
  startAt: toDatetimeLocal(new Date(now.getTime() + 60 * 60 * 1000)),
  endAt: toDatetimeLocal(new Date(now.getTime() + 2 * 60 * 60 * 1000)),
  reason: "",
};

export function BlockedTimesManager() {
  const { data: user, error: userError, isLoading: userLoading } = useCurrentProfessional();
  const professionalId = user?.id ?? null;

  const {
    data: blockedRows = [],
    error: blockedError,
    isLoading: blockedLoading,
    mutate,
  } = useBlockedTimes(professionalId);

  const [form, setForm] = useState<BlockedTimeFormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loading = userLoading || blockedLoading;

  const resetFeedback = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCreateBlockedTime = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!professionalId) {
      setErrorMessage("Usuario nao identificado. Faca login novamente.");
      return;
    }

    if (!form.startAt || !form.endAt) {
      setErrorMessage("Informe inicio e fim do bloqueio.");
      return;
    }

    const startDate = new Date(form.startAt);
    const endDate = new Date(form.endAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setErrorMessage("Data ou horario invalido.");
      return;
    }

    if (startDate >= endDate) {
      setErrorMessage("Data/hora final deve ser maior que a inicial.");
      return;
    }

    setSubmitting(true);

    try {
      await mutate(
        async (current = []) => {
          const { data, error } = await supabase
            .from("blocked_times")
            .insert({
              professional_id: professionalId,
              start_at: startDate.toISOString(),
              end_at: endDate.toISOString(),
              reason: form.reason.trim() || null,
            })
            .select("id, start_at, end_at, reason")
            .single();

          if (error) throw error;
          return [...current, data as BlockedTimeRow].sort((a, b) =>
            a.start_at.localeCompare(b.start_at),
          );
        },
        { revalidate: false },
      );

      setForm(initialFormState);
      setSuccessMessage("Bloqueio cadastrado com sucesso.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao cadastrar bloqueio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rowId: string) => {
    resetFeedback();

    const previous = blockedRows;
    await mutate(
      blockedRows.filter((item) => item.id !== rowId),
      { revalidate: false },
    );

    const { error } = await supabase.from("blocked_times").delete().eq("id", rowId);
    if (error) {
      setErrorMessage(error.message);
      await mutate(previous, { revalidate: false });
    }
  };

  const displayError = userError?.message ?? blockedError?.message ?? errorMessage;

  if (loading) {
    return (
      <div className="elevated-card p-6">
        <p className="text-sm text-body-secondary">Carregando bloqueios...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="elevated-card p-5">
        <h2 className="title-display text-lg">
          Bloquear horarios ou dias especificos
        </h2>
        <p className="mt-1 text-sm text-body-secondary">
          Use para folgas, feriados, compromissos ou pausas fora da rotina.
        </p>

        <form onSubmit={handleCreateBlockedTime} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="field-label">Inicio do bloqueio</span>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
              required
              className="input-shell"
            />
          </label>

          <label className="space-y-1">
            <span className="field-label">Fim do bloqueio</span>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
              required
              className="input-shell"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="field-label">Motivo (opcional)</span>
            <input
              type="text"
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              className="input-shell"
              placeholder="Ex: Feriado, viagem, almoco..."
            />
          </label>

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
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
          >
            {submitting ? "Salvando..." : "Adicionar bloqueio"}
          </button>
        </form>
      </div>

      <div className="elevated-card p-5">
        <h2 className="title-display text-lg">Bloqueios cadastrados</h2>

        {blockedRows.length === 0 ? (
          <p className="mt-4 text-sm text-body-secondary">Nenhum bloqueio cadastrado ainda.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {blockedRows.map((row) => (
              <article
                key={row.id}
                className="muted-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--ink-strong)]">
                      {formatDateTime(row.start_at)} - {formatDateTime(row.end_at)}
                    </p>
                    <p className="text-sm text-body-secondary">
                      {row.reason ? row.reason : "Sem motivo informado."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(row.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
