"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AvailabilityRow } from "@/types/domain";
import { useCurrentProfessional } from "@/lib/hooks/useCurrentProfessional";
import { useAvailability } from "@/lib/hooks/useAvailability";

const weekdayOptions = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terca-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sabado" },
  { value: "0", label: "Domingo" },
];

type AvailabilityFormState = {
  weekday: string;
  startTime: string;
  endTime: string;
};

const initialFormState: AvailabilityFormState = {
  weekday: "1",
  startTime: "08:00",
  endTime: "18:00",
};

export function AvailabilityManager() {
  const { data: user, error: userError, isLoading: userLoading } = useCurrentProfessional();
  const professionalId = user?.id ?? null;

  const {
    data,
    error: availabilityError,
    isLoading: availabilityLoading,
    mutate,
  } = useAvailability(professionalId);

  const availabilityRows = data?.rows ?? [];

  const [form, setForm] = useState<AvailabilityFormState>(initialFormState);
  const [breakDraft, setBreakDraft] = useState<{ start: string; end: string } | null>(null);
  const breakStart = breakDraft?.start ?? data?.dailyBreak.breakStart ?? "";
  const breakEnd = breakDraft?.end ?? data?.dailyBreak.breakEnd ?? "";
  const [submitting, setSubmitting] = useState(false);
  const [submittingBreak, setSubmittingBreak] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [breakErrorMessage, setBreakErrorMessage] = useState("");
  const [breakSuccessMessage, setBreakSuccessMessage] = useState("");

  const loading = userLoading || availabilityLoading;

  const resetAvailFeedback = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const resetBreakFeedback = () => {
    setBreakErrorMessage("");
    setBreakSuccessMessage("");
  };

  const handleSaveDailyBreak = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetBreakFeedback();
    resetAvailFeedback();

    if (!professionalId) {
      setBreakErrorMessage("Usuario nao identificado. Faca login novamente.");
      return;
    }

    const bs = breakStart.trim();
    const be = breakEnd.trim();
    const empty = bs === "" && be === "";
    const partial = (bs === "") !== (be === "");

    if (partial) {
      setBreakErrorMessage("Preencha inicio e fim do intervalo ou deixe os dois em branco.");
      return;
    }

    if (!empty && bs >= be) {
      setBreakErrorMessage("Fim do intervalo deve ser maior que o inicio.");
      return;
    }

    setSubmittingBreak(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        break_start_time: empty ? null : bs.length === 5 ? `${bs}:00` : bs,
        break_end_time: empty ? null : be.length === 5 ? `${be}:00` : be,
      })
      .eq("id", professionalId);

    if (error) {
      setBreakErrorMessage(error.message);
      setSubmittingBreak(false);
      return;
    }

    await mutate(
      {
        rows: availabilityRows,
        dailyBreak: { breakStart: bs, breakEnd: be },
      },
      { revalidate: false },
    );

    setBreakDraft(null);
    setBreakSuccessMessage(empty ? "Intervalo diario removido." : "Intervalo diario salvo.");
    setSubmittingBreak(false);
  };

  const handleCreateAvailability = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetAvailFeedback();
    resetBreakFeedback();

    if (!professionalId) {
      setErrorMessage("Usuario nao identificado. Faca login novamente.");
      return;
    }

    const weekday = Number(form.weekday);

    if (form.startTime >= form.endTime) {
      setErrorMessage("Horario de fim deve ser maior que o horario de inicio.");
      return;
    }

    setSubmitting(true);

    try {
      await mutate(
        async (current) => {
          const base = current ?? { rows: [], dailyBreak: { breakStart: "", breakEnd: "" } };
          const { data: inserted, error } = await supabase
            .from("availability")
            .insert({
              professional_id: professionalId,
              weekday,
              start_time: form.startTime,
              end_time: form.endTime,
              slot_interval_minutes: 0,
              is_active: true,
            })
            .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
            .single();

          if (error) throw error;
          return {
            ...base,
            rows: [...base.rows, inserted as AvailabilityRow].sort((a, b) =>
              a.weekday === b.weekday
                ? a.start_time.localeCompare(b.start_time)
                : a.weekday - b.weekday,
            ),
          };
        },
        { revalidate: false },
      );

      setForm(initialFormState);
      setSuccessMessage("Horario de atendimento cadastrado.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao cadastrar horario.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (row: AvailabilityRow) => {
    resetAvailFeedback();
    resetBreakFeedback();

    const nextActive = !row.is_active;
    await mutate(
      {
        rows: availabilityRows.map((item) =>
          item.id === row.id ? { ...item, is_active: nextActive } : item,
        ),
        dailyBreak: data?.dailyBreak ?? { breakStart: "", breakEnd: "" },
      },
      { revalidate: false },
    );

    const { error } = await supabase
      .from("availability")
      .update({ is_active: nextActive })
      .eq("id", row.id);

    if (error) {
      setErrorMessage(error.message);
      await mutate();
    }
  };

  const handleDelete = async (rowId: string) => {
    resetAvailFeedback();
    resetBreakFeedback();

    const previous = data;
    await mutate(
      {
        rows: availabilityRows.filter((item) => item.id !== rowId),
        dailyBreak: data?.dailyBreak ?? { breakStart: "", breakEnd: "" },
      },
      { revalidate: false },
    );

    const { error } = await supabase.from("availability").delete().eq("id", rowId);
    if (error) {
      setErrorMessage(error.message);
      if (previous) await mutate(previous, { revalidate: false });
    }
  };

  const displayError = userError?.message ?? availabilityError?.message ?? errorMessage;

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-600">Carregando horarios...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">Intervalo do dia</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Defina um periodo fixo (ex.: almoco) em que ninguem pode agendar. Vale para todos os dias em
          que voce tem disponibilidade.
        </p>

        <form onSubmit={handleSaveDailyBreak} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Inicio do intervalo</span>
            <input
              type="time"
              value={breakStart}
              onChange={(e) =>
                setBreakDraft((prev) => ({
                  start: e.target.value,
                  end: prev?.end ?? data?.dailyBreak.breakEnd ?? "",
                }))
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Fim do intervalo</span>
            <input
              type="time"
              value={breakEnd}
              onChange={(e) =>
                setBreakDraft((prev) => ({
                  start: prev?.start ?? data?.dailyBreak.breakStart ?? "",
                  end: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            />
          </label>

          {breakErrorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
              {breakErrorMessage}
            </p>
          ) : null}

          {breakSuccessMessage ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-2">
              {breakSuccessMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submittingBreak}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
          >
            {submittingBreak ? "Salvando..." : "Salvar intervalo"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">
          Configurar horarios de atendimento
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Defina os dias e faixas de horario que podem receber agendamentos.
        </p>

        <form onSubmit={handleCreateAvailability} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Dia da semana</span>
            <select
              value={form.weekday}
              onChange={(event) => setForm((prev) => ({ ...prev, weekday: event.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            >
              {weekdayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Inicio</span>
            <input
              type="time"
              value={form.startTime}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, startTime: event.target.value }))
              }
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Fim</span>
            <input
              type="time"
              value={form.endTime}
              onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
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
            className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
          >
            {submitting ? "Salvando..." : "Adicionar horario"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">Horarios cadastrados</h2>

        {availabilityRows.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">
            Nenhuma faixa de horario cadastrada ainda.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {availabilityRows.map((row) => {
              const weekdayLabel =
                weekdayOptions.find((option) => Number(option.value) === row.weekday)?.label ??
                `Dia ${row.weekday}`;

              return (
                <article
                  key={row.id}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-neutral-900">{weekdayLabel}</p>
                      <p className="text-sm text-neutral-600">
                        {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {row.is_active ? "Ativo" : "Inativo"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(row)}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        {row.is_active ? "Desativar" : "Ativar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
