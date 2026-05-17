// ─── Tela de disponibilidade — configuração semanal de horários ───────────────

import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import type { AvailabilityRow, ThemeTokens } from "../types";
import { weekdayOptions } from "../constants/theme";
import { formatHour } from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";

type AvailabilityScreenProps = {
  professionalId: string;
  theme: ThemeTokens;
};

export function AvailabilityScreen({ professionalId, theme }: AvailabilityScreenProps) {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [weekday, setWeekday] = useState<number>(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [breakStart, setBreakStart] = useState("");
  const [breakEnd, setBreakEnd] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRows = async () => {
    setLoading(true);
    setError("");
    const [availRes, profileRes] = await Promise.all([
      supabase
        .from("availability")
        .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
        .eq("professional_id", professionalId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("profiles")
        .select("break_start_time, break_end_time")
        .eq("id", professionalId)
        .maybeSingle(),
    ]);

    if (availRes.error) {
      setError(availRes.error.message);
      setLoading(false);
      return;
    }

    setRows((availRes.data ?? []) as AvailabilityRow[]);

    const prof = profileRes.error ? null : profileRes.data;
    if (prof?.break_start_time != null && prof?.break_end_time != null) {
      setBreakStart(formatHour(String(prof.break_start_time)));
      setBreakEnd(formatHour(String(prof.break_end_time)));
    } else {
      setBreakStart("");
      setBreakEnd("");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [professionalId]);

  const resetForm = () => {
    setWeekday(1);
    setStartTime("08:00");
    setEndTime("18:00");
    setEditingRowId(null);
  };

  const handleSaveDailyBreak = async () => {
    setMessage("");
    setError("");
    const bs = breakStart.trim();
    const be = breakEnd.trim();
    const empty = bs === "" && be === "";
    const partial = (bs === "") !== (be === "");

    if (partial) {
      setError("Preencha início e fim do intervalo ou deixe os dois em branco.");
      return;
    }
    if (!empty && bs >= be) {
      setError("O fim do intervalo deve ser depois do início.");
      return;
    }

    const { error: saveErr } = await supabase
      .from("profiles")
      .update({
        break_start_time: empty ? null : bs.length === 5 ? `${bs}:00` : bs,
        break_end_time: empty ? null : be.length === 5 ? `${be}:00` : be,
      })
      .eq("id", professionalId);

    if (saveErr) {
      setError(saveErr.message);
      return;
    }
    setMessage(empty ? "Intervalo diário removido." : "Intervalo diário salvo.");
    await loadRows();
  };

  const handleSaveAvailability = async () => {
    setMessage("");
    setError("");

    if (startTime >= endTime) {
      setError("Horário final deve ser maior que o inicial.");
      return;
    }

    if (editingRowId) {
      const { error: updateError } = await supabase
        .from("availability")
        .update({
          weekday,
          start_time: startTime,
          end_time: endTime,
          slot_interval_minutes: 0,
        })
        .eq("id", editingRowId);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      setMessage("Horário atualizado.");
    } else {
      const { error: insertError } = await supabase.from("availability").insert({
        professional_id: professionalId,
        weekday,
        start_time: startTime,
        end_time: endTime,
        slot_interval_minutes: 0,
        is_active: true,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }
      setMessage("Horário cadastrado.");
    }

    resetForm();
    await loadRows();
  };

  const toggleActive = async (row: AvailabilityRow) => {
    setMessage("");
    setError("");
    const { error: updateError } = await supabase
      .from("availability")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setRows((current) =>
      current.map((item) =>
        item.id === row.id ? { ...item, is_active: !item.is_active } : item
      )
    );
  };

  const handleDelete = async (rowId: string) => {
    setMessage("");
    setError("");
    const { error: deleteError } = await supabase.from("availability").delete().eq("id", rowId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== rowId));
  };

  const handleEdit = (row: AvailabilityRow) => {
    setMessage("");
    setError("");
    setEditingRowId(row.id);
    setWeekday(row.weekday);
    setStartTime(formatHour(row.start_time));
    setEndTime(formatHour(row.end_time));
  };

  return (
    <View style={styles.sectionContainer}>
      {/* ── Intervalo diário (almoco / pausa) ─────────────────────────────── */}
      <AnimatedSection delay={40} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Intervalo do dia</Text>
        <Text style={[styles.placeholderText, { color: theme.textSecondary, marginBottom: 8 }]}>
          Horário em que você não aceita agendamentos (ex.: almoço). Vale para todos os dias com
          disponibilidade.
        </Text>
        <TextInput
          value={breakStart}
          onChangeText={setBreakStart}
          placeholder="Início do intervalo (HH:MM)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={breakEnd}
          onChangeText={setBreakEnd}
          placeholder="Fim do intervalo (HH:MM)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleSaveDailyBreak}
            style={[styles.button, styles.refreshButton, { backgroundColor: theme.buttonPrimary }]}
          >
            <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>Salvar intervalo</Text>
          </Pressable>
        </View>
      </AnimatedSection>

      {/* ── Formulário ─────────────────────────────────────────────────────── */}
      <AnimatedSection delay={70} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          {editingRowId ? "Editar horário de disponibilidade" : "Configurar disponibilidade"}
        </Text>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Dia da semana</Text>
        <View style={styles.statusRow}>
          {weekdayOptions.map((option) => {
            const selected = weekday === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setWeekday(option.value)}
                style={[
                  styles.statusButton,
                  { backgroundColor: theme.background, borderColor: theme.border },
                  selected && styles.statusButtonSelected,
                  selected && { backgroundColor: theme.buttonPrimary, borderColor: theme.buttonPrimary },
                ]}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    { color: selected ? theme.buttonPrimaryText : theme.textSecondary },
                    selected && styles.statusButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={startTime}
          onChangeText={setStartTime}
          placeholder="Início (HH:MM)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={endTime}
          onChangeText={setEndTime}
          placeholder="Fim (HH:MM)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />

        <View style={styles.actionRow}>
          <Pressable
            onPress={handleSaveAvailability}
            style={[styles.button, styles.refreshButton, { backgroundColor: theme.buttonPrimary }]}
          >
            <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
              {editingRowId ? "Salvar alterações" : "Adicionar horário"}
            </Text>
          </Pressable>
          {editingRowId ? (
            <Pressable
              onPress={resetForm}
              style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {message ? <Text style={styles.successBanner}>{message}</Text> : null}
      </AnimatedSection>

      {/* ── Lista de horários cadastrados ──────────────────────────────────── */}
      <AnimatedSection delay={130} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Horários cadastrados</Text>

        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : rows.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhuma faixa cadastrada.
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={[styles.listCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>
                {weekdayOptions.find((option) => option.value === row.weekday)?.label ?? `Dia ${row.weekday}`}
              </Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {formatHour(row.start_time)} – {formatHour(row.end_time)}
              </Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {row.is_active ? "Ativo" : "Inativo"}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleEdit(row)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Editar</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => toggleActive(row)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                    {row.is_active ? "Desativar" : "Ativar"}
                  </Text>
                </Pressable>
                <Pressable style={styles.smallDangerButton} onPress={() => handleDelete(row.id)}>
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
