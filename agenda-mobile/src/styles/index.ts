// ─── Estilos globais do app mobile ───────────────────────────────────────────
//
// Centralizados aqui para facilitar busca e ajuste visual.
// Cores dinâmicas (que dependem do tema) são passadas via inline style nos componentes.

import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // ── Loading / Auth ────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f7f2ef",
  },
  loadingText: {
    color: "#5b4d49",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f2ef",
    padding: 20,
  },
  authCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fffdfb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8d7cf",
    padding: 20,
    gap: 10,
    zIndex: 2,
  },

  // ── Background animado ────────────────────────────────────────────────────
  animatedBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  animatedParticle: {
    position: "absolute",
    borderRadius: 999,
    shadowColor: "#8b5cf6",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },

  // ── Layout principal ──────────────────────────────────────────────────────
  dashboardContainer: {
    flex: 1,
    backgroundColor: "#f7f2ef",
    padding: 20,
  },
  topHeader: {
    minHeight: 70,
    gap: 2,
    borderBottomWidth: 0,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  headerButtonsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  mainContent: {
    flex: 1,
    zIndex: 2,
  },
  contentScroll: {
    flex: 1,
  },
  dashboardScrollContent: {
    gap: 14,
    paddingBottom: 36,
  },
  sectionContainer: {
    gap: 12,
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabsContainer: {
    minHeight: 56,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tabsScroll: {
    marginBottom: 0,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  tabButton: {
    borderWidth: 1,
    borderColor: "#d8c5bc",
    borderRadius: 999,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  tabButtonSelected: {
    backgroundColor: "#2f2725",
    borderColor: "#2f2725",
  },
  tabButtonText: {
    color: "#5f4b45",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  tabButtonTextSelected: {
    color: "#fff",
  },

  // ── Botões de controle ────────────────────────────────────────────────────
  themeToggleButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  themeToggleButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pressableShrink: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 18,
    backgroundColor: "#fffdfb",
    padding: 16,
    gap: 10,
  },
  listCard: {
    borderWidth: 1,
    borderColor: "#edded7",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 12,
    gap: 8,
  },
  rescheduleCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 10,
    gap: 8,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fffdfb",
    padding: 14,
    gap: 6,
  },
  appointmentCard: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fffdfb",
    padding: 14,
    gap: 6,
  },
  placeholderCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fffdfb",
    padding: 14,
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fffdfb",
    padding: 12,
    gap: 4,
  },

  // ── Dashboard – cards especiais ───────────────────────────────────────────
  dashboardFeatureCard: {
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: "#488399",
    padding: 18,
    gap: 12,
  },
  dashboardHeroCard: {
    borderWidth: 1,
    borderColor: "#e8dff8",
    borderRadius: 16,
    backgroundColor: "#f7f5ff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  todayAppointmentCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#d7ecff",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 5,
  },
  summaryCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: "#edf0f5",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },

  // ── Tipografia ────────────────────────────────────────────────────────────
  brand: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7f5e55",
    letterSpacing: 0.4,
    fontFamily: "serif",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2f231f",
    fontFamily: "serif",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f231f",
    fontFamily: "serif",
  },
  subtitle: {
    fontSize: 14,
    color: "#6d5a54",
  },
  heroGreeting: {
    fontSize: 40,
    lineHeight: 46,
    fontFamily: "serif",
    letterSpacing: 0.2,
  },
  heroGreetingPrimary: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    fontFamily: "serif",
  },
  heroGreetingAccent: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    fontStyle: "italic",
    fontFamily: "serif",
  },
  dashboardFeatureGreeting: {
    fontSize: 13,
    fontWeight: "600",
  },
  dashboardFeatureTitle: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "500",
    fontFamily: "serif",
  },
  dashboardGreeting: {
    color: "#1f2937",
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "serif",
  },
  dashboardDate: {
    marginTop: 2,
    color: "#7c8392",
    fontSize: 13,
  },
  cardSubtitleSmall: {
    color: "#9097a3",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionLink: {
    color: "#6f56d9",
    fontSize: 12,
    fontWeight: "700",
  },
  fieldLabel: {
    color: "#5f4b45",
    fontWeight: "600",
    fontSize: 13,
  },
  kpiLabel: {
    color: "#6d5a54",
    fontSize: 12,
  },
  kpiValue: {
    color: "#2f231f",
    fontSize: 24,
    fontWeight: "700",
  },
  placeholderTitle: {
    color: "#2f231f",
    fontWeight: "700",
  },
  placeholderText: {
    color: "#6d5a54",
    fontSize: 13,
  },
  statusLabel: {
    fontSize: 12,
    color: "#5f4b45",
    fontWeight: "600",
    textTransform: "capitalize",
  },

  // ── Agendamentos ──────────────────────────────────────────────────────────
  appointmentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2f231f",
  },
  appointmentCustomer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d2f2a",
  },
  appointmentMeta: {
    fontSize: 13,
    color: "#6d5a54",
  },

  // ── Agenda (uso rápido no dia a dia) ───────────────────────────────────────
  agendaHeaderCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  agendaNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  agendaNavHit: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
  },
  agendaNavChevron: {
    fontSize: 22,
    fontWeight: "700",
  },
  agendaDateCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
  },
  agendaDateCaption: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  agendaDateTitle: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "serif",
  },
  agendaDateSub: {
    fontSize: 12,
    fontWeight: "600",
  },
  agendaHeaderActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  agendaChipBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 13,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  agendaChipBtnGrow: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  agendaChipBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
  agendaListHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 6,
    marginTop: 4,
  },
  agendaAppointmentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 10,
  },
  agendaAppointmentMainRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  agendaTimeColumn: {
    width: 58,
    alignItems: "flex-start",
    paddingTop: 2,
  },
  agendaTimeStart: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  agendaTimeEnd: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  agendaClientBlock: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  agendaClientName: {
    fontSize: 18,
    fontWeight: "800",
  },
  agendaServiceLine: {
    fontSize: 14,
    fontWeight: "700",
  },
  agendaPhoneLine: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  agendaNotesLine: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  agendaStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  agendaStatusBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  agendaPrimaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  agendaPrimaryBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  agendaPrimaryBtnOutline: {
    borderWidth: 2,
  },
  agendaPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
  agendaSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 6,
    textTransform: "uppercase",
  },
  agendaStatusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  agendaStatusGridBtn: {
    width: "47.5%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  rescheduleSlotsScroll: {
    marginTop: 8,
    marginHorizontal: -4,
    maxHeight: 54,
  },
  rescheduleSlotsScrollContent: {
    gap: 8,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
  },

  bookingCodeValue: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: "700",
  },
  bookingLinkValue: {
    color: "#6b7280",
    fontSize: 12,
  },
  bookingLinkHero: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
    marginTop: 10,
    marginBottom: 4,
  },
  bookingShareHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  bookingCodeSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
  },

  // ── Dashboard – hoje ──────────────────────────────────────────────────────
  todayAppointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todayStatusBadge: {
    backgroundColor: "#f1bebe",
    color: "#6b3f3f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "800",
  },
  todayTimeBadge: {
    backgroundColor: "#f4d38a",
    color: "#5f512f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
  },
  todayCustomerName: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    color: "#1f2937",
    marginTop: 4,
  },
  todayServiceName: {
    color: "#ea9393",
    fontSize: 13,
    fontWeight: "700",
  },
  todayPrice: {
    color: "#488399",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  summaryGrid: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryValueBlue: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: "#488399",
  },
  summaryValueYellow: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: "#f4d38a",
  },
  summaryValueGreen: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: "#ea9393",
  },
  summaryValueGray: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: "#f1bebe",
  },
  summaryLabel: {
    color: "#687588",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Inputs e botões ───────────────────────────────────────────────────────
  input: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  datePickerButtonLabel: {
    fontSize: 12,
    color: "#7b6b66",
    fontWeight: "600",
  },
  datePickerButtonValue: {
    fontSize: 16,
    color: "#2f231f",
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#2f2725",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  refreshButton: {
    flex: 1,
  },
  smallButton: {
    borderWidth: 1,
    borderColor: "#d8c5bc",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  smallButtonText: {
    color: "#5f4b45",
    fontWeight: "600",
    fontSize: 12,
  },
  smallDangerButton: {
    borderWidth: 1,
    borderColor: "#fecdca",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#fee4e2",
  },
  smallDangerButtonText: {
    color: "#b42318",
    fontWeight: "600",
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  statusButton: {
    borderWidth: 1,
    borderColor: "#d8c5bc",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  statusButtonSelected: {
    backgroundColor: "#2f2725",
    borderColor: "#2f2725",
  },
  statusButtonText: {
    fontSize: 12,
    color: "#5f4b45",
    fontWeight: "600",
  },
  statusButtonTextSelected: {
    color: "#fff",
  },

  // ── Layouts de linha ──────────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f2e8e3",
    paddingTop: 8,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  // ── Feedback ──────────────────────────────────────────────────────────────
  errorText: {
    color: "#b42318",
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: "#fee4e2",
    color: "#b42318",
    borderWidth: 1,
    borderColor: "#fecdca",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: "#dcfae6",
    color: "#067647",
    borderWidth: 1,
    borderColor: "#abefc6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  loadingListContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
});
