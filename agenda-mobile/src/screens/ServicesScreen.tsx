// ─── Tela de serviços — CRUD completo + upload de foto ─────────────────────

import { useMemo, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import type { ThemeTokens } from "../types";
import {
  formatMoneyBr,
  pickImageFromLibrary,
  removeFromPublicUrl,
  uploadImageAsset,
} from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";
import { useServices } from "../hooks/useServices";

type ServicesScreenProps = {
  professionalId: string;
  theme: ThemeTokens;
};

export function ServicesScreen({ professionalId, theme }: ServicesScreenProps) {
  const { data: services = [], isLoading, mutate } = useServices(professionalId);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingImageAsset, setPendingImageAsset] = useState<
    Awaited<ReturnType<typeof pickImageFromLibrary>>
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => services.filter((s) => s.is_active).length, [services]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3500);
  };
  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };

  const handlePickPending = async () => {
    const asset = await pickImageFromLibrary();
    if (!asset) return;
    setPendingImageAsset(asset);
    setPendingImageUri(asset.uri);
  };

  const clearPending = () => {
    setPendingImageAsset(null);
    setPendingImageUri(null);
  };

  const handleCreate = async () => {
    setMessage("");
    setError("");

    const parsedDuration = Number(duration);
    const parsedPrice = Number(price.replace(",", "."));

    if (!name.trim()) return showError("Informe o nome do serviço.");
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0)
      return showError("Duração inválida.");
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return showError("Valor inválido.");

    setSubmitting(true);

    const { data: inserted, error: insertError } = await supabase
      .from("services")
      .insert({
        professional_id: professionalId,
        name: name.trim(),
        duration_minutes: parsedDuration,
        price: parsedPrice,
        description: description.trim() || null,
        is_active: true,
      })
      .select("id, name, duration_minutes, price, description, image_url, is_active, created_at")
      .single();

    if (insertError || !inserted) {
      showError(insertError?.message ?? "Falha ao cadastrar serviço.");
      setSubmitting(false);
      return;
    }

    // Upload da imagem (não-bloqueante: serviço já existe)
    if (pendingImageAsset) {
      const result = await uploadImageAsset(
        "service",
        pendingImageAsset,
        professionalId,
        `services/${inserted.id}/cover`,
      );
      if (result.ok) {
        await supabase.from("services").update({ image_url: result.publicUrl }).eq("id", inserted.id);
      } else {
        showError(`Serviço criado, mas imagem falhou: ${result.error}`);
      }
    }

    setName("");
    setDuration("60");
    setPrice("");
    setDescription("");
    clearPending();
    setSubmitting(false);
    showMessage("Serviço cadastrado.");
    mutate();
  };

  const handleChangeServiceImage = async (serviceId: string) => {
    setError("");
    const asset = await pickImageFromLibrary();
    if (!asset) return;

    setBusyId(serviceId);
    const result = await uploadImageAsset("service", asset, professionalId, `services/${serviceId}/cover`);
    if (!result.ok) {
      showError(result.error);
      setBusyId(null);
      return;
    }
    const { error: updateError } = await supabase
      .from("services")
      .update({ image_url: result.publicUrl })
      .eq("id", serviceId);
    if (updateError) {
      showError(updateError.message);
      setBusyId(null);
      return;
    }
    mutate(
      services.map((s) => (s.id === serviceId ? { ...s, image_url: result.publicUrl } : s)),
      false,
    );
    setBusyId(null);
    showMessage("Imagem atualizada.");
  };

  const handleRemoveServiceImage = async (serviceId: string, imageUrl: string | null) => {
    if (!imageUrl) return;
    setError("");
    setBusyId(serviceId);
    await removeFromPublicUrl("service", imageUrl);
    const { error: updateError } = await supabase
      .from("services")
      .update({ image_url: null })
      .eq("id", serviceId);
    if (updateError) {
      showError(updateError.message);
      setBusyId(null);
      return;
    }
    mutate(
      services.map((s) => (s.id === serviceId ? { ...s, image_url: null } : s)),
      false,
    );
    setBusyId(null);
    showMessage("Imagem removida.");
  };

  const toggleActive = async (serviceId: string, currentActive: boolean) => {
    mutate(
      services.map((s) => (s.id === serviceId ? { ...s, is_active: !currentActive } : s)),
      false,
    );
    const { error: updateError } = await supabase
      .from("services")
      .update({ is_active: !currentActive })
      .eq("id", serviceId);
    if (updateError) {
      mutate();
      showError(updateError.message);
    }
  };

  const confirmDelete = (serviceId: string, serviceName: string) => {
    Alert.alert(
      "Excluir serviço",
      `Deseja excluir "${serviceName}"? Se houver agendamentos vinculados, ele será desativado.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => handleDelete(serviceId) },
      ],
    );
  };

  const handleDelete = async (serviceId: string) => {
    const { count: linked, error: linkedError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("service_id", serviceId);
    if (linkedError) return showError(linkedError.message);

    if ((linked ?? 0) > 0) {
      const { error: updateError } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", serviceId)
        .eq("professional_id", professionalId);
      if (updateError) return showError(updateError.message);
      mutate(services.map((s) => (s.id === serviceId ? { ...s, is_active: false } : s)), false);
      return showMessage("Serviço com agendamentos foi desativado.");
    }

    const target = services.find((s) => s.id === serviceId);
    if (target?.image_url) await removeFromPublicUrl("service", target.image_url);

    const { error: deleteError } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId)
      .eq("professional_id", professionalId);
    if (deleteError) return showError(deleteError.message);
    mutate(services.filter((s) => s.id !== serviceId), false);
    showMessage("Serviço excluído.");
  };

  return (
    <View style={styles.sectionContainer}>
      <AnimatedSection delay={70} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Novo serviço</Text>

        {/* Foto opcional */}
        <View style={styles.serviceRowWithThumb}>
          <View style={styles.serviceThumb}>
            {pendingImageUri ? (
              <Image source={{ uri: pendingImageUri }} style={styles.serviceThumbImage} />
            ) : (
              <Text style={styles.serviceThumbPlaceholder}>＋</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
              Foto do serviço (opcional)
            </Text>
            <View style={styles.serviceThumbActions}>
              <Pressable onPress={handlePickPending} style={styles.imagePickerBtn}>
                <Text style={styles.imagePickerBtnText}>
                  {pendingImageUri ? "Trocar foto" : "Escolher foto"}
                </Text>
              </Pressable>
              {pendingImageUri ? (
                <Pressable onPress={clearPending} style={styles.imagePickerDangerBtn}>
                  <Text style={styles.imagePickerDangerBtnText}>Remover</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

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
          style={[styles.button, styles.refreshButton, { backgroundColor: theme.buttonPrimary }, submitting && styles.buttonDisabled]}
        >
          <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
            {submitting ? "Salvando..." : "Cadastrar serviço"}
          </Text>
        </Pressable>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {message ? <Text style={styles.successBanner}>{message}</Text> : null}
      </AnimatedSection>

      <AnimatedSection delay={130} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          Serviços ({activeCount} ativos de {services.length})
        </Text>
        {isLoading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : services.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Nenhum serviço cadastrado.</Text>
        ) : (
          services.map((service) => (
            <View
              key={service.id}
              style={[
                styles.listCard,
                styles.serviceRowWithThumb,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            >
              <View style={styles.serviceThumb}>
                {service.image_url ? (
                  <Image source={{ uri: service.image_url }} style={styles.serviceThumbImage} />
                ) : (
                  <Text style={styles.serviceThumbPlaceholder}>
                    {(service.name[0] ?? "?").toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>
                  {service.name}
                </Text>
                <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                  {service.duration_minutes} min • R$ {formatMoneyBr(service.price)}
                </Text>
                {service.description ? (
                  <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                    {service.description}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.appointmentMeta,
                    { color: service.is_active ? theme.accent : theme.textSecondary },
                  ]}
                >
                  {service.is_active ? "● Ativo" : "○ Inativo"}
                </Text>

                <View style={styles.serviceThumbActions}>
                  <Pressable
                    onPress={() => handleChangeServiceImage(service.id)}
                    disabled={busyId === service.id}
                    style={styles.imagePickerBtn}
                  >
                    <Text style={styles.imagePickerBtnText}>
                      {busyId === service.id
                        ? "…"
                        : service.image_url
                        ? "Trocar foto"
                        : "Adicionar foto"}
                    </Text>
                  </Pressable>
                  {service.image_url ? (
                    <Pressable
                      onPress={() => handleRemoveServiceImage(service.id, service.image_url)}
                      disabled={busyId === service.id}
                      style={styles.imagePickerDangerBtn}
                    >
                      <Text style={styles.imagePickerDangerBtnText}>Remover foto</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => toggleActive(service.id, service.is_active)}
                  >
                    <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                      {service.is_active ? "Desativar" : "Ativar"}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.smallDangerButton} onPress={() => confirmDelete(service.id, service.name)}>
                    <Text style={styles.smallDangerButtonText}>Excluir</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </AnimatedSection>
    </View>
  );
}
