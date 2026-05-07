"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type AvailabilityRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_interval_minutes: number;
  is_active: boolean;
};

type AvailabilityFormState = {
  weekday: string;
  startTime: string;
  endTime: string;
  intervalMinutes: string;
};

const weekdayOptions = [
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terca-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sabado" },
  { value: "0", label: "Domingo" },
];

const initialFormState: AvailabilityFormState = {
  weekday: "1",
  startTime: "08:00",
  endTime: "18:00",
  intervalMinutes: "0",
};

export function AvailabilityManager() {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>([]);
  const [form, setForm] = useState<AvailabilityFormState>(initialFormState);
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

  const fetchAvailability = async (userId: string) => {
    const { data, error } = await supabase
      .from("availability")
      .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
      .eq("professional_id", userId)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAvailabilityRows((data ?? []) as AvailabilityRow[]);
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
      await fetchAvailability(user.id);
      setLoading(false);
    };

    loadInitialData();
  }, []);

  const resetFeedback = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleCreateAvailability = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!professionalId) {
      setErrorMessage("Usuario nao identificado. Faca login novamente.");
      return;
    }

    const weekday = Number(form.weekday);
    const intervalMinutes = Number(form.intervalMinutes);

    if (form.startTime >= form.endTime) {
      setErrorMessage("Horario de fim deve ser maior que o horario de inicio.");
      return;
    }

    if (!Number.isFinite(intervalMinutes) || intervalMinutes < 0 || intervalMinutes > 180) {
      setErrorMessage("Intervalo invalido. Use entre 0 e 180 minutos.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("availability").insert({
      professional_id: professionalId,
      weekday,
      start_time: form.startTime,
      end_time: form.endTime,
      slot_interval_minutes: intervalMinutes,
      is_active: true,
    });

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    await fetchAvailability(professionalId);
    setForm(initialFormState);
    setSuccessMessage("Horario de atendimento cadastrado.");
    setSubmitting(false);
  };

  const handleToggleActive = async (row: AvailabilityRow) => {
    resetFeedback();

    const { error } = await supabase
      .from("availability")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAvailabilityRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, is_active: !item.is_active } : item
      )
    );
  };

  const handleDelete = async (rowId: string) => {
    resetFeedback();

    const { error } = await supabase.from("availability").delete().eq("id", rowId);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAvailabilityRows((current) => current.filter((item) => item.id !== rowId));
  };

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
        <h2 className="text-lg font-semibold text-neutral-900">
          Configurar horarios de atendimento
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Defina os dias e faixas de horario que podem receber agendamentos.
        </p>

        <form onSubmit={handleCreateAvailability} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
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
            <span className="text-sm font-medium text-neutral-700">Intervalo (minutos)</span>
            <input
              type="number"
              min={0}
              max={180}
              value={form.intervalMinutes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, intervalMinutes: event.target.value }))
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            />
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
                        {row.start_time.slice(0, 5)} - {row.end_time.slice(0, 5)} •
                        Intervalo: {row.slot_interval_minutes} min
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
