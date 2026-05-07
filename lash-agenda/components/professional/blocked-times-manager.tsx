"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type BlockedTimeRow = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

type BlockedTimeFormState = {
  startAt: string;
  endAt: string;
  reason: string;
};

const now = new Date();
const initialStart = new Date(now.getTime() + 60 * 60 * 1000);
const initialEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

const toDatetimeLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const initialFormState: BlockedTimeFormState = {
  startAt: toDatetimeLocal(initialStart),
  endAt: toDatetimeLocal(initialEnd),
  reason: "",
};

const formatDateTime = (isoDateString: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDateString));

export function BlockedTimesManager() {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [blockedRows, setBlockedRows] = useState<BlockedTimeRow[]>([]);
  const [form, setForm] = useState<BlockedTimeFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const ensureProfessionalProfile = async (user: User) => {
    const fullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;
    const phone =
      typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      phone,
      role: "professional",
    });

    return error;
  };

  const fetchBlockedTimes = async (userId: string) => {
    const { data, error } = await supabase
      .from("blocked_times")
      .select("id, start_at, end_at, reason")
      .eq("professional_id", userId)
      .order("start_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setBlockedRows((data ?? []) as BlockedTimeRow[]);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Nao foi possivel carregar o usuario logado.");
        setLoading(false);
        return;
      }

      const profileError = await ensureProfessionalProfile(user);
      if (profileError) {
        setErrorMessage(profileError.message);
        setLoading(false);
        return;
      }

      setProfessionalId(user.id);
      await fetchBlockedTimes(user.id);
      setLoading(false);
    };

    loadInitialData();
  }, []);

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

    const { error } = await supabase.from("blocked_times").insert({
      professional_id: professionalId,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      reason: form.reason.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    await fetchBlockedTimes(professionalId);
    setForm(initialFormState);
    setSuccessMessage("Bloqueio cadastrado com sucesso.");
    setSubmitting(false);
  };

  const handleDelete = async (rowId: string) => {
    resetFeedback();

    const { error } = await supabase.from("blocked_times").delete().eq("id", rowId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setBlockedRows((current) => current.filter((item) => item.id !== rowId));
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-600">Carregando bloqueios...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">
          Bloquear horarios ou dias especificos
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Use para folgas, feriados, compromissos ou pausas fora da rotina.
        </p>

        <form onSubmit={handleCreateBlockedTime} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Inicio do bloqueio</span>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startAt: event.target.value }))}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Fim do bloqueio</span>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endAt: event.target.value }))}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Motivo (opcional)</span>
            <input
              type="text"
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
              placeholder="Ex: Feriado, viagem, almoco..."
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
              {errorMessage}
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
            {submitting ? "Salvando..." : "Adicionar bloqueio"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">Bloqueios cadastrados</h2>

        {blockedRows.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">Nenhum bloqueio cadastrado ainda.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {blockedRows.map((row) => (
              <article
                key={row.id}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-neutral-900">
                      {formatDateTime(row.start_at)} - {formatDateTime(row.end_at)}
                    </p>
                    <p className="text-sm text-neutral-600">
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
