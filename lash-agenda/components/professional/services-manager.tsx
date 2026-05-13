"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { ServiceRow } from "@/types/domain";
import { ensureProfessionalProfile } from "@/lib/utils/profile";

// ─── Estado do formulário ─────────────────────────────────────────────────────

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

// ─── Componente ───────────────────────────────────────────────────────────────

export function ServicesManager() {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [form, setForm] = useState<ServiceFormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeCount = useMemo(
    () => services.filter((service) => service.is_active).length,
    [services]
  );

  const resetFeedback = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const fetchServices = async (userId: string) => {
    const { data, error } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price, description, is_active, created_at")
      .eq("professional_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setServices((data ?? []) as ServiceRow[]);
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
      await fetchServices(user.id);
      setLoading(false);
    };

    loadInitialData();
  }, []);

  const handleCreateService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!professionalId) {
      setErrorMessage("Usuario nao identificado. Faca login novamente.");
      return;
    }

    const durationMinutes = Number(form.durationMinutes);
    const parsedPrice = Number(form.price.replace(",", "."));

    if (!form.name.trim()) {
      setErrorMessage("Informe o nome do serviço.");
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setErrorMessage("Duracao invalida. Use um numero em minutos.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMessage("Valor invalido.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("services").insert({
      professional_id: professionalId,
      name: form.name.trim(),
      duration_minutes: durationMinutes,
      price: parsedPrice,
      description: form.description.trim() || null,
      is_active: true,
    });

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    await fetchServices(professionalId);
    setForm(initialFormState);
    setSuccessMessage("Serviço cadastrado com sucesso.");
    setSubmitting(false);
  };

  const handleToggleActive = async (service: ServiceRow) => {
    resetFeedback();

    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setServices((current) =>
      current.map((item) =>
        item.id === service.id ? { ...item, is_active: !item.is_active } : item
      )
    );
  };

  const handleDelete = async (serviceId: string) => {
    resetFeedback();
    if (!professionalId) {
      setErrorMessage("Usuario nao identificado. Faca login novamente.");
      return;
    }

    const { count: linkedAppointments, error: linkedError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("service_id", serviceId);

    if (linkedError) {
      setErrorMessage(linkedError.message);
      return;
    }

    if ((linkedAppointments ?? 0) > 0) {
      const { error: updateError } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", serviceId)
        .eq("professional_id", professionalId);

      if (updateError) {
        setErrorMessage(updateError.message);
        return;
      }

      setServices((current) =>
        current.map((item) => (item.id === serviceId ? { ...item, is_active: false } : item))
      );
      setSuccessMessage("Servico com agendamentos nao pode ser excluido. Ele foi desativado.");
      return;
    }

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId)
      .eq("professional_id", professionalId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setServices((current) => current.filter((item) => item.id !== serviceId));
    setSuccessMessage("Servico excluido com sucesso.");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-600">Carregando serviços...</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">Novo serviço</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Cadastre nome, duracao, valor e descricao.
        </p>

        <form onSubmit={handleCreateService} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Nome do serviço</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
              placeholder="Ex: Volume Brasileiro"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Duracao (minutos)</span>
            <input
              type="number"
              min={1}
              max={600}
              value={form.durationMinutes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
              }
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Valor (R$)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
              placeholder="150.00"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Descricao</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
              placeholder="Detalhes do atendimento, materiais, orientacoes..."
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
            {submitting ? "Salvando..." : "Cadastrar serviço"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Serviços cadastrados</h2>
          <span className="text-sm text-neutral-500">
            {activeCount} ativos de {services.length}
          </span>
        </div>

        {services.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">
            Nenhum serviço cadastrado ainda.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-neutral-900">{service.name}</h3>
                    <p className="text-sm text-neutral-600">
                      {service.duration_minutes} min • R${" "}
                      {Number(service.price).toFixed(2).replace(".", ",")}
                    </p>
                    {service.description ? (
                      <p className="text-sm text-neutral-500">{service.description}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(service)}
                      className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
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
