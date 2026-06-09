// ─── Agenda — navegação rápida por dia e cartões fáceis de usar no trabalho ───

import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSWRConfig } from "swr";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { supabase } from "../lib/supabase";
import type {
  AppointmentRow,
  AppointmentStatus,
  AvailabilityRow,
  ThemeTokens,
} from "../types";
import { statusOptions } from "../constants/theme";
import {
  addDaysToIsoDate,
  toIsoDate,
  formatHour,
  formatDateBr,
  getDurationMinutes,
  generateRescheduleSlots,
  buildWhatsappUrlForAppointment,
} from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";
import { useAppointments } from "../hooks/useAppointments";
import { dashboardKey } from "../hooks/useDashboard";

type AgendaScreenProps = {
  professionalId: string;
  theme: ThemeTokens;
};

function dayHeading(iso: string): string {
  const today = toIsoDate();
  const tomorrow = addDaysToIsoDate(today, 1);
  const yesterday = addDaysToIsoDate(today, -1);
  if (iso === today) return "Hoje";
  if (iso === tomorrow) return "Amanhã";
  if (iso === yesterday) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(`${iso}T12:00:00`));
}

function statusLabel(status: AppointmentStatus): string {
  return statusOptions.find((o) => o.value === status)?.label ?? status;
}

export function AgendaScreen({ professionalId, theme }: AgendaScreenProps) {
  const [selectedDate, setSelectedDate] = useState(toIsoDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(toIsoDate());
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleSlotOptions, setRescheduleSlotOptions] = useState<
    { startTime: string; endTime: string }[]
  >([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { data: appointments = [], isLoading, mutate } = useAppointments(professionalId, selectedDate);
  const { mutate: globalMutate } = useSWRConfig();

  const isToday = selectedDate === toIsoDate();

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3500);
  };

  const reschedulingAppointment = useMemo(
    () => appointments.find((a) => a.id === reschedulingId) ?? null,
    [appointments, reschedulingId],
  );

  useEffect(() => {
    if (!reschedulingId || !reschedulingAppointment) {
      setRescheduleSlotOptions([]);
      return;
    }

    const loadRescheduleSlots = async () => {
      setLoadingRescheduleSlots(true);

      const weekday = new Date(`${rescheduleDate}T00:00:00`).getDay();
      const dayStartIso = new Date(`${rescheduleDate}T00:00:00`).toISOString();
      const dayEndIso = new Date(`${rescheduleDate}T23:59:59`).toISOString();

      const [availabilityRes, blockedRes, bookedRes, profileRes] = await Promise.all([
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
        supabase
          .from("profiles")
          .select("break_start_time, break_end_time")
          .eq("id", professionalId)
          .maybeSingle(),
      ]);

      if (availabilityRes.error || blockedRes.error || bookedRes.error) {
        setErrorMessage("Erro ao carregar horários disponíveis.");
        setLoadingRescheduleSlots(false);
        return;
      }

      const prof = profileRes.error ? null : profileRes.data;
      const dailyBreak =
        prof?.break_start_time != null && prof?.break_end_time != null
          ? {
              startTime: formatHour(String(prof.break_start_time)),
              endTime: formatHour(String(prof.break_end_time)),
            }
          : null;

      const slots = generateRescheduleSlots({
        rescheduleDate,
        durationMinutes: getDurationMinutes(
          reschedulingAppointment.start_time,
          reschedulingAppointment.end_time,
        ),
        availabilityRows: (availabilityRes.data ?? []) as AvailabilityRow[],
        blockedRows: (blockedRes.data ?? []) as { start_at: string; end_at: string }[],
        bookedRows: (bookedRes.data ?? []) as { start_time: string; end_time: string }[],
        excludeAppointmentId: reschedulingId,
        dailyBreak,
      });

      setRescheduleSlotOptions(slots);
      setRescheduleStartTime((cur) => {
        if (slots.some((s) => s.startTime === cur)) return cur;
        return slots[0]?.startTime ?? "";
      });
      setLoadingRescheduleSlots(false);
    };

    loadRescheduleSlots();
  }, [professionalId, reschedulingId, rescheduleDate, reschedulingAppointment]);

  const handleChangeStatus = async (appointment: AppointmentRow, status: AppointmentStatus) => {
    setErrorMessage("");
    setUpdatingId(appointment.id);

    mutate(
      appointments.map((a) => (a.id === appointment.id ? { ...a, status } : a)),
      false,
    );

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointment.id)
      .eq("professional_id", professionalId);

    if (error) {
      mutate();
      setErrorMessage(error.message);
      setUpdatingId(null);
      return;
    }

    globalMutate(dashboardKey(professionalId));
    showSuccess(
      status === "confirmado" ? "Confirmado. Avise a cliente pelo WhatsApp se quiser." : "Situação atualizada.",
    );
    setUpdatingId(null);
  };

  const handleOpenWhatsapp = async (appointment: AppointmentRow) => {
    const url = buildWhatsappUrlForAppointment(appointment);
    if (!url) {
      setErrorMessage("Telefone inválido para WhatsApp.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setErrorMessage("Não foi possível abrir o WhatsApp.");
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setSelectedDate(toIsoDate(pickedDate));
  };

  const handleStartReschedule = (appointment: AppointmentRow) => {
    setErrorMessage("");
    setSuccessMessage("");
    setRescheduleSlotOptions([]);
    setReschedulingId(appointment.id);
    setRescheduleDate(appointment.appointment_date);
    setRescheduleStartTime(formatHour(appointment.start_time));
    setShowRescheduleDatePicker(false);
  };

  const handleCancelReschedule = () => {
    setReschedulingId(null);
    setRescheduleSlotOptions([]);
    setRescheduleStartTime("");
  };

  const handleRescheduleDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowRescheduleDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setRescheduleDate(toIsoDate(pickedDate));
  };

  const handleSaveReschedule = async (appointment: AppointmentRow) => {
    if (appointment.id !== reschedulingId) return;
    setSavingReschedule(true);
    setErrorMessage("");

    const slot = rescheduleSlotOptions.find((s) => s.startTime === rescheduleStartTime);
    if (!slot) {
      setErrorMessage("Selecione um horário disponível.");
      setSavingReschedule(false);
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        appointment_date: rescheduleDate,
        start_time: slot.startTime,
        end_time: slot.endTime,
      })
      .eq("id", appointment.id)
      .eq("professional_id", professionalId);

    if (error) {
      setErrorMessage(error.message);
      setSavingReschedule(false);
      return;
    }

    handleCancelReschedule();
    setSavingReschedule(false);
    mutate();
    showSuccess("Horário alterado.");
  };

  return (
    <View style={styles.sectionContainer}>
      <AnimatedSection delay={60} style={[styles.agendaHeaderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.agendaDateCaption, { color: theme.textSecondary }]}>AGENDA</Text>

        <View style={styles.agendaNavRow}>
          <Pressable
            accessibilityLabel="Dia anterior"
            onPress={() => setSelectedDate((d) => addDaysToIsoDate(d, -1))}
            style={[styles.agendaNavHit, { borderColor: theme.border, backgroundColor: theme.background }]}
          >
            <Text style={[styles.agendaNavChevron, { color: theme.textPrimary }]}>‹</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.agendaDateCenter, { backgroundColor: theme.accentSoft }]}
          >
            <Text style={[styles.agendaDateTitle, { color: theme.textPrimary }]}>{dayHeading(selectedDate)}</Text>
            <Text style={[styles.agendaDateSub, { color: theme.textSecondary }]}>
              {formatDateBr(selectedDate)}
              {!isToday ? " · toque para escolher a data" : ""}
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Próximo dia"
            onPress={() => setSelectedDate((d) => addDaysToIsoDate(d, 1))}
            style={[styles.agendaNavHit, { borderColor: theme.border, backgroundColor: theme.background }]}
          >
            <Text style={[styles.agendaNavChevron, { color: theme.textPrimary }]}>›</Text>
          </Pressable>
        </View>

        {showDatePicker ? (
          <DateTimePicker
            value={new Date(`${selectedDate}T12:00:00`)}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        ) : null}

        <View style={styles.agendaHeaderActions}>
          <Pressable
            onPress={() => setSelectedDate(toIsoDate())}
            style={[styles.agendaChipBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
          >
            <Text style={[styles.agendaChipBtnText, { color: theme.textPrimary }]}>Ir para hoje</Text>
          </Pressable>
          <Pressable
            onPress={() => mutate()}
            style={[styles.agendaChipBtnGrow, { borderColor: theme.accent, backgroundColor: theme.accentSoft }]}
          >
            <Text style={[styles.agendaChipBtnText, { color: theme.accent }]}>Atualizar lista</Text>
          </Pressable>
        </View>

        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successBanner}>{successMessage}</Text> : null}
      </AnimatedSection>

      <AnimatedSection delay={110}>
        <Text style={[styles.agendaListHeading, { color: theme.textSecondary }]}>
          {isToday ? "Seus horários de hoje" : "Horários deste dia"}
          {!isLoading ? ` · ${appointments.length}` : ""}
        </Text>

        {isLoading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : appointments.length === 0 ? (
          <View style={[styles.agendaAppointmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
              Nenhum cliente neste dia. Use as setas ou o calendário para ver outros dias.
            </Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <View
              key={appointment.id}
              style={[styles.agendaAppointmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.agendaAppointmentMainRow}>
                <View style={styles.agendaTimeColumn}>
                  <Text style={[styles.agendaTimeStart, { color: theme.accent }]}>{formatHour(appointment.start_time)}</Text>
                  <Text style={[styles.agendaTimeEnd, { color: theme.textSecondary }]}>
                    até {formatHour(appointment.end_time)}
                  </Text>
                </View>

                <View style={styles.agendaClientBlock}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <Text style={[styles.agendaClientName, { color: theme.textPrimary }]} numberOfLines={2}>
                      {appointment.customer_name}
                    </Text>
                    <View style={[styles.agendaStatusBadge, { backgroundColor: theme.accentSoft }]}>
                      <Text style={[styles.agendaStatusBadgeText, { color: theme.accent }]}>
                        {statusLabel(appointment.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.agendaServiceLine, { color: theme.textSecondary }]} numberOfLines={2}>
                    {appointment.service?.name ?? "Serviço"}
                  </Text>
                  <Text style={[styles.agendaPhoneLine, { color: theme.textSecondary }]} selectable>
                    {appointment.customer_phone}
                  </Text>
                </View>
              </View>

              {appointment.notes ? (
                <Text style={[styles.agendaNotesLine, { color: theme.textSecondary }]} numberOfLines={3}>
                  Obs.: {appointment.notes}
                </Text>
              ) : null}

              <View style={styles.agendaPrimaryRow}>
                <Pressable
                  style={[styles.agendaPrimaryBtn, { backgroundColor: "#22c55e" }]}
                  onPress={() => handleOpenWhatsapp(appointment)}
                >
                  <Text style={[styles.agendaPrimaryBtnText, { color: "#ffffff" }]}>WhatsApp</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.agendaPrimaryBtn,
                    styles.agendaPrimaryBtnOutline,
                    { borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                  onPress={() =>
                    reschedulingId === appointment.id ? handleCancelReschedule() : handleStartReschedule(appointment)
                  }
                >
                  <Text style={[styles.agendaPrimaryBtnText, { color: theme.textPrimary }]}>
                    {reschedulingId === appointment.id ? "Fechar" : "Mudar horário"}
                  </Text>
                </Pressable>
              </View>

              {reschedulingId === appointment.id ? (
                <View style={[styles.rescheduleCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.agendaSectionLabel, { color: theme.textSecondary }]}>Nova data</Text>
                  <Pressable
                    style={[styles.agendaChipBtnGrow, { borderColor: theme.border, backgroundColor: theme.card }]}
                    onPress={() => setShowRescheduleDatePicker(true)}
                  >
                    <Text style={[styles.agendaChipBtnText, { color: theme.textSecondary }]}>
                      {formatDateBr(rescheduleDate)}
                    </Text>
                  </Pressable>
                  {showRescheduleDatePicker ? (
                    <DateTimePicker
                      value={new Date(`${rescheduleDate}T12:00:00`)}
                      mode="date"
                      display="default"
                      onChange={handleRescheduleDateChange}
                    />
                  ) : null}

                  <Text style={[styles.agendaSectionLabel, { color: theme.textSecondary }]}>Horários livres</Text>
                  {loadingRescheduleSlots ? (
                    <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
                  ) : rescheduleSlotOptions.length === 0 ? (
                    <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                      Nenhum horário livre neste dia — troque a data ou a disponibilidade na web.
                    </Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.rescheduleSlotsScroll}
                      contentContainerStyle={styles.rescheduleSlotsScrollContent}
                    >
                      {rescheduleSlotOptions.map((slot) => {
                        const selected = rescheduleStartTime === slot.startTime;
                        return (
                          <Pressable
                            key={`${slot.startTime}-${slot.endTime}`}
                            onPress={() => setRescheduleStartTime(slot.startTime)}
                            style={[
                              styles.smallButton,
                              {
                                borderColor: selected ? theme.buttonPrimary : theme.border,
                                backgroundColor: selected ? theme.buttonPrimary : theme.card,
                                paddingHorizontal: 14,
                                paddingVertical: 11,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.smallButtonText,
                                { color: selected ? theme.buttonPrimaryText : theme.textSecondary },
                              ]}
                            >
                              {slot.startTime}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                  <View style={[styles.actionRow, { marginTop: 10 }]}>
                    <Pressable
                      style={[
                        styles.agendaPrimaryBtn,
                        { flex: 1, backgroundColor: theme.buttonPrimary },
                        (savingReschedule || loadingRescheduleSlots) && styles.buttonDisabled,
                      ]}
                      onPress={() => handleSaveReschedule(appointment)}
                      disabled={savingReschedule || loadingRescheduleSlots || rescheduleSlotOptions.length === 0}
                    >
                      <Text style={[styles.agendaPrimaryBtnText, { color: theme.buttonPrimaryText }]}>
                        {savingReschedule ? "Salvando..." : "Salvar novo horário"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <Text style={[styles.agendaSectionLabel, { color: theme.textSecondary }]}>Situação do agendamento</Text>
              <View style={styles.agendaStatusGrid}>
                {statusOptions.map((option) => {
                  const selected = appointment.status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      disabled={updatingId === appointment.id}
                      onPress={() => handleChangeStatus(appointment, option.value)}
                      style={[
                        styles.agendaStatusGridBtn,
                        { borderColor: theme.border, backgroundColor: theme.background },
                        selected && {
                          backgroundColor: theme.buttonPrimary,
                          borderColor: theme.buttonPrimary,
                        },
                        updatingId === appointment.id && styles.buttonDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.agendaPrimaryBtnText,
                          { fontSize: 13 },
                          { color: selected ? theme.buttonPrimaryText : theme.textSecondary },
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
