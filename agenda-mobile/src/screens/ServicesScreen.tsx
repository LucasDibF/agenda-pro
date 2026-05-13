// ─── Tela de serviços — CRUD completo ────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import type { ServiceRow, ThemeTokens } from "../types";
import { formatMoneyBr } from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";

type ServicesScreenProps = {
  professionalId: string;
  theme: ThemeTokens;
};

export function ServicesScreen({ professionalId, theme }: ServicesScreenProps) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(
    () => services.filter((item) => item.is_active).length,
    [services]
  );

  const loadServices = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price, description, is_active, created_at")
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setServices((data ?? []) as ServiceRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, [professionalId]);

  const handleCreate = async () => {
    setMessage("");
    setError("");

    const parsedDuration = Number(duration);
    const parsedPrice = Number(price.replace(",", "."));

    if (!name.trim()) {
      setError("Informe o nome do serviço.");
      return;
    }
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setError("Duração inválida.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Valor inválido.");
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from("services").insert({
      professional_id: professionalId,
      name: name.trim(),
      duration_minutes: parsedDuration,
      price: parsedPrice,
      description: description.trim() || null,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setName("");
    setDuration("60");
    setPrice("");
    setDescription("");
    setMessage("Serviço cadastrado com sucesso.");
    setSubmitting(false);
    await loadServices();
  };

  const toggleActive = async (service: ServiceRow) => {
    setMessage("");
    setError("");
    const { error: updateError } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setServices((current) =>
      current.map((item) =>
        item.id === service.id ? { ...item, is_active: !item.is_active } : item
      )
    );
  };

  const handleDelete = async (serviceId: string) => {
    setMessage("");
    setError("");

    const { count: linked, error: linkedError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("service_id", serviceId);

    if (linkedError) {
      setError(linkedError.message);
      return;
    }

    if ((linked ?? 0) > 0) {
      const { error: updateError } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", serviceId)
        .eq("professional_id", professionalId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setServices((current) =>
        current.map((item) => (item.id === serviceId ? { ...item, is_active: false } : item))
      );
      setMessage("Serviço com agendamentos não pode ser excluído. Ele foi desativado.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId)
      .eq("professional_id", professionalId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Serviço excluído.");
    setServices((current) => current.filter((item) => item.id !== serviceId));
  };

  return (
    <View style={styles.sectionContainer}>
      {/* ── Formulário de cadastro ─────────────────────────────────────────── */}
      <AnimatedSection delay={70} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Novo serviço</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome do serviço"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={duration}
          onChangeText={setDuration}
          placeholder="Duração em minutos"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="Valor (ex: 150.00)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição (opcional)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
          multiline
        />
        <Pressable
          onPress={handleCreate}
          disabled={submitting}
          style={[styles.button, styles.refreshButton, { backgroundColor: theme.buttonPrimary }]}
        >
          <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
            {submitting ? "Salvando..." : "Cadastrar serviço"}
          </Text>
        </Pressable>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {message ? <Text style={styles.successBanner}>{message}</Text> : null}
      </AnimatedSection>

      {/* ── Lista de serviços ──────────────────────────────────────────────── */}
      <AnimatedSection delay={130} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          Serviços cadastrados ({activeCount} ativos de {services.length})
        </Text>

        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : services.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhum serviço cadastrado.
          </Text>
        ) : (
          services.map((service) => (
            <View key={service.id} style={[styles.listCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>{service.name}</Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {service.duration_minutes} min • R$ {formatMoneyBr(service.price)}
              </Text>
              {service.description ? (
                <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                  {service.description}
                </Text>
              ) : null}
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {service.is_active ? "Ativo" : "Inativo"}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => toggleActive(service)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                    {service.is_active ? "Desativar" : "Ativar"}
                  </Text>
                </Pressable>
                <Pressable style={styles.smallDangerButton} onPress={() => handleDelete(service.id)}>
                  <Text style={styles.smallDangerButtonText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </AnimatedSection>
    </View>
  );
}
