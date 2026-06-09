// ─── Tela de bloqueios de horário ─────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { supabase } from "../lib/supabase";
import type { BlockedTimeRow, ThemeTokens } from "../types";
import { toIsoDate, formatDateBr, formatDateTimeBr, toDateAndTimeInput, parseDateTimeInput } from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";

type BlockedTimesScreenProps = {
  professionalId: string;
  theme: ThemeTokens;
};

export function BlockedTimesScreen({ professionalId, theme }: BlockedTimesScreenProps) {
  const now = new Date();
  const startDefault = toDateAndTimeInput(new Date(now.getTime() + 60 * 60 * 1000));
  const endDefault = toDateAndTimeInput(new Date(now.getTime() + 2 * 60 * 60 * 1000));

  const [rows, setRows] = useState<BlockedTimeRow[]>([]);
  const [startDate, setStartDate] = useState(startDefault.date);
  const [startTime, setStartTime] = useState(startDefault.time);
  const [endDate, setEndDate] = useState(endDefault.date);
  const [endTime, setEndTime] = useState(endDefault.time);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("blocked_times")
      .select("id, start_at, end_at, reason")
      .eq("professional_id", professionalId)
      .order("start_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as BlockedTimeRow[]);
    setLoading(false);
  }, [professionalId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleCreate = async () => {
    setMessage("");
    setError("");

    const start = parseDateTimeInput(startDate, startTime);
    const end = parseDateTimeInput(endDate, endTime);

    if (!start || !end) {
      setError("Data/hora inválida. Use YYYY-MM-DD e HH:MM.");
      return;
    }
    if (start >= end) {
      setError("Data/hora final deve ser maior que a inicial.");
      return;
    }

    const { error: insertError } = await supabase.from("blocked_times").insert({
      professional_id: professionalId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      reason: reason.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setReason("");
    setMessage("Bloqueio cadastrado com sucesso.");
    await loadRows();
  };

  const handleDelete = async (rowId: string) => {
    setMessage("");
    setError("");
    const { error: deleteError } = await supabase.from("blocked_times").delete().eq("id", rowId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== rowId));
  };

  const handleStartDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowStartDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setStartDate(toIsoDate(pickedDate));
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowStartTimePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setStartTime(toDateAndTimeInput(pickedDate).time);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowEndDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setEndDate(toIsoDate(pickedDate));
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowEndTimePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setEndTime(toDateAndTimeInput(pickedDate).time);
  };

  return (
    <View style={styles.sectionContainer}>
      {/* ── Formulário de cadastro ─────────────────────────────────────────── */}
      <AnimatedSection delay={70} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Novo bloqueio</Text>

        {/* Data início */}
        <Pressable
          onPress={() => setShowStartDatePicker(true)}
          style={[styles.datePickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Data início</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>
            {formatDateBr(startDate)}
          </Text>
        </Pressable>
        {showStartDatePicker ? (
          <DateTimePicker mode="date" value={new Date(`${startDate}T00:00:00`)} onChange={handleStartDateChange} />
        ) : null}

        {/* Hora início */}
        <Pressable
          onPress={() => setShowStartTimePicker(true)}
          style={[styles.datePickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Hora início</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>{startTime}</Text>
        </Pressable>
        {showStartTimePicker ? (
          <DateTimePicker
            mode="time"
            value={parseDateTimeInput(startDate, startTime) ?? new Date(`${startDate}T00:00:00`)}
            onChange={handleStartTimeChange}
          />
        ) : null}

        {/* Data fim */}
        <Pressable
          onPress={() => setShowEndDatePicker(true)}
          style={[styles.datePickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Data fim</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>
            {formatDateBr(endDate)}
          </Text>
        </Pressable>
        {showEndDatePicker ? (
          <DateTimePicker mode="date" value={new Date(`${endDate}T00:00:00`)} onChange={handleEndDateChange} />
        ) : null}

        {/* Hora fim */}
        <Pressable
          onPress={() => setShowEndTimePicker(true)}
          style={[styles.datePickerButton, { backgroundColor: theme.background, borderColor: theme.border }]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Hora fim</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>{endTime}</Text>
        </Pressable>
        {showEndTimePicker ? (
          <DateTimePicker
            mode="time"
            value={parseDateTimeInput(endDate, endTime) ?? new Date(`${endDate}T00:00:00`)}
            onChange={handleEndTimeChange}
          />
        ) : null}

        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Motivo (opcional)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <Pressable
          onPress={handleCreate}
          style={[styles.button, styles.refreshButton, { backgroundColor: theme.buttonPrimary }]}
        >
          <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>Adicionar bloqueio</Text>
        </Pressable>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {message ? <Text style={styles.successBanner}>{message}</Text> : null}
      </AnimatedSection>

      {/* ── Lista de bloqueios ─────────────────────────────────────────────── */}
      <AnimatedSection delay={130} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Bloqueios cadastrados</Text>

        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : rows.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhum bloqueio cadastrado.
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={[styles.listCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>
                {formatDateTimeBr(row.start_at)} - {formatDateTimeBr(row.end_at)}
              </Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {row.reason || "Sem motivo informado"}
              </Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.smallDangerButton} onPress={() => handleDelete(row.id)}>
                  <Text style={styles.smallDangerButtonText}>Remover</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </AnimatedSection>
    </View>
  );
}
