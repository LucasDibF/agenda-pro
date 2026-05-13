// ─── Tela de agenda — visualização diária, status, reagendamento e WhatsApp ───

import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { supabase } from "../lib/supabase";
import type { AppointmentRow, AppointmentSelectRow, AppointmentStatus, AvailabilityRow, ThemeTokens } from "../types";
import { statusOptions } from "../constants/theme";
import {
  toIsoDate,
  formatHour,
  formatDateBr,
  getDurationMinutes,
  generateRescheduleSlots,
  buildWhatsappUrlForAppointment,
} from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";

type AgendaScreenProps = {
  professionalId: string;
  theme: ThemeTokens;
};

export function AgendaScreen({ professionalId, theme }: AgendaScreenProps) {
  const [selectedDate, setSelectedDate] = useState(toIsoDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(toIsoDate());
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleSlotOptions, setRescheduleSlotOptions] = useState<
    Array<{ startTime: string; endTime: string }>
  >([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadAppointments = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, service:services(name)"
      )
      .eq("professional_id", professionalId)
      .eq("appointment_date", selectedDate)
      .order("start_time", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const normalized = ((data ?? []) as AppointmentSelectRow[]).map((row) => ({
      ...row,
      service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
    }));
    setAppointments(normalized);
    setLoading(false);
  };

  useEffect(() => {
    loadAppointments();
  }, [professionalId, selectedDate]);

  const reschedulingAppointment = useMemo(
    () => appointments.find((item) => item.id === reschedulingId) ?? null,
    [appointments, reschedulingId]
  );

  // ── Carrega slots disponíveis ao abrir reagendamento ─────────────────────
  useEffect(() => {
    const loadRescheduleSlots = async () => {
      if (!reschedulingId || !reschedulingAppointment) {
        setRescheduleSlotOptions([]);
        return;
      }

      setLoadingRescheduleSlots(true);

      const weekday = new Date(`${rescheduleDate}T00:00:00`).getDay();
      const dayStartIso = new Date(`${rescheduleDate}T00:00:00`).toISOString();
      const dayEndIso = new Date(`${rescheduleDate}T23:59:59`).toISOString();

      const [availabilityRes, blockedRes, bookedRes] = await Promise.all([
        supabase
          .from("availability")
          .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
          .eq("professional_id", professionalId)
          .eq("is_active", true)
          .eq("weekday", weekday)
          .order("start_time", { ascending: true }),
        supabase
          .from("blocked_times")
          .select("id, start_at, end_at")
          .eq("professional_id", professionalId)
          .lt("start_at", dayEndIso)
          .gt("end_at", dayStartIso),
        supabase
          .from("appointments")
          .select("start_time, end_time")
          .eq("professional_id", professionalId)
          .eq("appointment_date", rescheduleDate)
          .in("status", ["agendado", "confirmado"])
          .neq("id", reschedulingId),
      ]);

      if (availabilityRes.error || blockedRes.error || bookedRes.error) {
        setErrorMessage(
          availabilityRes.error?.message ??
            blockedRes.error?.message ??
            bookedRes.error?.message ??
            "Erro ao carregar horários disponíveis."
        );
        setLoadingRescheduleSlots(false);
        return;
      }

      const durationMinutes = getDurationMinutes(
        reschedulingAppointment.start_time,
        reschedulingAppointment.end_time
      );

      const slots = generateRescheduleSlots({
        rescheduleDate,
        durationMinutes,
        availabilityRows: (availabilityRes.data ?? []) as AvailabilityRow[],
        blockedRows: (blockedRes.data ?? []) as Array<{ start_at: string; end_at: string }>,
        bookedRows: (bookedRes.data ?? []) as Array<{ start_time: string; end_time: string }>,
        excludeAppointmentId: reschedulingId,
      });

      setRescheduleSlotOptions(slots);
      setRescheduleStartTime((current) => {
        if (slots.some((slot) => slot.startTime === current)) return current;
        return slots[0]?.startTime ?? "";
      });
      setLoadingRescheduleSlots(false);
    };

    loadRescheduleSlots();
  }, [professionalId, reschedulingId, rescheduleDate, reschedulingAppointment]);

  const handleChangeStatus = async (appointment: AppointmentRow, status: AppointmentStatus) => {
    setErrorMessage("");
    setSuccessMessage("");
    setUpdatingId(appointment.id);

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointment.id)
      .eq("professional_id", professionalId);

    if (error) {
      setErrorMessage(error.message);
      setUpdatingId(null);
      return;
    }

    setAppointments((current) =>
      current.map((item) => (item.id === appointment.id ? { ...item, status } : item))
    );

    setSuccessMessage(
      status === "confirmado"
        ? "Status confirmado. Use o botão WhatsApp para avisar a cliente."
        : "Status atualizado com sucesso."
    );
    setUpdatingId(null);
  };

  const handleOpenWhatsapp = async (appointment: AppointmentRow) => {
    setErrorMessage("");
    setSuccessMessage("");

    const url = buildWhatsappUrlForAppointment(appointment);
    if (!url) {
      setErrorMessage("Telefone da cliente invalido para WhatsApp.");
      return;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      setErrorMessage("Nao foi possivel abrir o WhatsApp neste dispositivo.");
      return;
    }

    await Linking.openURL(url);
    setSuccessMessage("WhatsApp aberto para envio da mensagem.");
  };

  const handleDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setSelectedDate(toIsoDate(pickedDate));
  };

  const handleStartReschedule = (appointment: AppointmentRow) => {
    setErrorMessage("");
    setSuccessMessage("");
    setReschedulingId(appointment.id);
    setRescheduleDate(appointment.appointment_date);
    setRescheduleStartTime(formatHour(appointment.start_time));
    setShowRescheduleDatePicker(false);
  };

  const handleRescheduleDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowRescheduleDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setRescheduleDate(toIsoDate(pickedDate));
  };

  const handleSaveReschedule = async (appointment: AppointmentRow) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSavingReschedule(true);

    const selectedSlot = rescheduleSlotOptions.find(
      (slot) => slot.startTime === rescheduleStartTime
    );

    if (!selectedSlot) {
      setErrorMessage("Selecione um horário disponível.");
      setSavingReschedule(false);
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        appointment_date: rescheduleDate,
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
      })
      .eq("id", appointment.id)
      .eq("professional_id", professionalId);

    if (error) {
      setErrorMessage(error.message);
      setSavingReschedule(false);
      return;
    }

    setSuccessMessage("Agendamento reagendado com sucesso.");
    setReschedulingId(null);
    setSavingReschedule(false);
    await loadAppointments();
  };

  return (
    <View style={styles.sectionContainer}>
      {/* ── Seletor de data ────────────────────────────────────────────────── */}
      <AnimatedSection delay={70} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Agenda por dia</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={[styles.datePickerButton, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Data</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>
            {formatDateBr(selectedDate)}
          </Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={new Date(`${selectedDate}T00:00:00`)}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        ) : null}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setSelectedDate(toIsoDate())}
            style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
          >
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Hoje</Text>
          </Pressable>
          <Pressable
            onPress={loadAppointments}
            style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
          >
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Atualizar</Text>
          </Pressable>
        </View>
        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successBanner}>{successMessage}</Text> : null}
      </AnimatedSection>

      {/* ── Lista de agendamentos ──────────────────────────────────────────── */}
      <AnimatedSection delay={130} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          Lista do dia ({appointments.length})
        </Text>

        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Carregando agendamentos...
          </Text>
        ) : appointments.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhum agendamento para esta data.
          </Text>
        ) : (
          appointments.map((appointment) => (
            <View key={appointment.id} style={[styles.listCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>
                {formatHour(appointment.start_time)} - {formatHour(appointment.end_time)} •{" "}
                {appointment.service?.name ?? "Serviço"}
              </Text>
              <Text style={[styles.appointmentCustomer, { color: theme.textPrimary }]}>
                {appointment.customer_name}
              </Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {appointment.customer_phone} • {appointment.customer_email}
              </Text>
              {appointment.notes ? (
                <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                  Obs: {appointment.notes}
                </Text>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleStartReschedule(appointment)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Reagendar</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleOpenWhatsapp(appointment)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>WhatsApp</Text>
                </Pressable>
              </View>

              {/* ── Painel de reagendamento ──────────────────────────────── */}
              {reschedulingId === appointment.id ? (
                <View style={[styles.rescheduleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Novo horário</Text>

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => setShowRescheduleDatePicker(true)}
                    >
                      <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                        Data: {formatDateBr(rescheduleDate)}
                      </Text>
                    </Pressable>
                  </View>

                  {showRescheduleDatePicker ? (
                    <DateTimePicker
                      value={new Date(`${rescheduleDate}T00:00:00`)}
                      mode="date"
                      display="default"
                      onChange={handleRescheduleDateChange}
                    />
                  ) : null}

                  {loadingRescheduleSlots ? (
                    <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                      Carregando horários disponíveis...
                    </Text>
                  ) : rescheduleSlotOptions.length === 0 ? (
                    <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                      Nenhum horário disponível para esta data.
                    </Text>
                  ) : (
                    <View style={styles.statusRow}>
                      {rescheduleSlotOptions.map((slot) => {
                        const selected = rescheduleStartTime === slot.startTime;
                        return (
                          <Pressable
                            key={`${slot.startTime}-${slot.endTime}`}
                            onPress={() => setRescheduleStartTime(slot.startTime)}
                            style={[
                              styles.statusButton,
                              { backgroundColor: theme.background, borderColor: theme.border },
                              selected && styles.statusButtonSelected,
                              selected && {
                                backgroundColor: theme.buttonPrimary,
                                borderColor: theme.buttonPrimary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusButtonText,
                                { color: selected ? theme.buttonPrimaryText : theme.textSecondary },
                              ]}
                            >
                              {slot.startTime} - {slot.endTime}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => handleSaveReschedule(appointment)}
                      disabled={savingReschedule}
                    >
                      <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                        {savingReschedule ? "Salvando..." : "Salvar reagendamento"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.smallDangerButton}
                      onPress={() => setReschedulingId(null)}
                      disabled={savingReschedule}
                    >
                      <Text style={styles.smallDangerButtonText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* ── Botões de status ────────────────────────────────────── */}
              <View style={styles.statusRow}>
                {statusOptions.map((option) => {
                  const selected = appointment.status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      disabled={updatingId === appointment.id}
                      onPress={() => handleChangeStatus(appointment, option.value)}
                      style={[
                        styles.statusButton,
                        { backgroundColor: theme.background, borderColor: theme.border },
                        selected && styles.statusButtonSelected,
                        selected && { backgroundColor: theme.buttonPrimary, borderColor: theme.buttonPrimary },
                        updatingId === appointment.id && styles.buttonDisabled,
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
            </View>
          ))
        )}
      </AnimatedSection>
    </View>
  );
}
