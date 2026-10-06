import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { resources } from "../lib/resources";
import type { Absence, Appointment, Client, ClinicWorkDay, DiagnosticPeriod, Employee, Service, Specialty } from "../lib/types";
import { buildSlotSuggestions, pickUniqueSuggestionsByTime, type SlotSuggestion } from "../lib/slot-suggestions";
import { matchesStaffFilter, parseStaffFilter, staffFilterLabel } from "../lib/staff-filter";
import { fetchGroupSessionMembers } from "../lib/group-session-members";
import { resolveGroupJoinVisual } from "../lib/group-sessions";
import { mutationErrorMessage, useToast } from "../components/feedback";
import { useAuth } from "../components/auth/AuthProvider";
import { canManageAbsences, canManageSchedule, isSpecialist } from "../lib/roles";
import { useSchedulePreferences } from "./useSchedulePreferences";
import { useClientScheduleUndo } from "./useClientScheduleUndo";
import { isEditableTarget, isUndoShortcut } from "../lib/keyboard-shortcuts";
import type { SlotDraft } from "../types/slot-draft";

export function useSchedulePage() {
  const { user } = useAuth();
  const canEdit = user ? canManageSchedule(user.role) : false;
  const readOnly = user ? isSpecialist(user.role) : false;
  const employeeDeleted = readOnly && user?.employeeActive === false;
  const canMarkAttendance = readOnly && !employeeDeleted && !!user?.employeeId;
  const canCreateAbsence =
    !!user &&
    !employeeDeleted &&
    (canManageAbsences(user.role) || (isSpecialist(user.role) && !!user.employeeId));
  const absenceOnlyClicks = readOnly && canCreateAbsence;
  const { preferences, save: saveDisplayPreferences } = useSchedulePreferences();
  const qc = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDateState] = useState(() => searchParams.get("date") || format(new Date(), "yyyy-MM-dd"));
  const [highlightServiceId, setHighlightServiceId] = useState("");
  const [highlightClientId, setHighlightClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [dayPrintOpen, setDayPrintOpen] = useState(false);
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);

  const setDate = (next: string) => {
    setDateState(next);
    setSearchParams(next === format(new Date(), "yyyy-MM-dd") ? {} : { date: next });
  };

  const employeesQ = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await api.get<Employee[]>("/api/employees")).data,
  });

  const specialtiesQ = useQuery({
    queryKey: ["specialties"],
    queryFn: () => resources.specialties.list() as Promise<Specialty[]>,
    enabled: canEdit,
  });

  const staffFilter = useMemo(() => parseStaffFilter(employeeId), [employeeId]);

  const appointmentsQ = useQuery({
    queryKey: ["appointments", date],
    queryFn: async () => (await api.get<Appointment[]>(`/api/appointments?date=${date}`)).data,
  });

  const diagnosticPeriodsQ = useQuery({
    queryKey: ["diagnostic-periods", date],
    queryFn: () => resources.diagnosticPeriods.list({ date }) as Promise<DiagnosticPeriod[]>,
  });

  const loadQ = useQuery({
    queryKey: ["load", date],
    queryFn: async () =>
      (await api.get<{ employeeId: string; shortName: string; hours: number }[]>(`/api/availability/load?date=${date}`))
        .data,
    enabled: canEdit,
  });

  const servicesQ = useQuery({
    queryKey: ["services"],
    queryFn: () => resources.services.list(false),
    enabled: canEdit,
  });

  const clientsQ = useQuery({
    queryKey: ["clients"],
    queryFn: () => resources.clients.list(false),
    enabled: canEdit,
  });

  const roomsQ = useQuery({
    queryKey: ["rooms"],
    queryFn: () => resources.rooms.list(false),
    enabled: canEdit,
  });

  const absencesQ = useQuery({
    queryKey: ["absences"],
    queryFn: resources.absences.list,
  });

  const clinicDaysQ = useQuery({
    queryKey: ["clinic-work-days"],
    queryFn: () => resources.settings.clinicWorkDays() as Promise<ClinicWorkDay[]>,
  });

  const absencesForDay = useMemo(() => {
    const day = parseISO(date);
    return (absencesQ.data ?? []).filter((a: Absence) => {
      const start = parseISO(a.startDate.slice(0, 10));
      const end = parseISO(a.endDate.slice(0, 10));
      return day >= start && day <= end;
    });
  }, [absencesQ.data, date]);

  const activeAppointments = useMemo(
    () => (appointmentsQ.data ?? []).filter((appointment) => appointment.status !== "CANCELLED"),
    [appointmentsQ.data],
  );

  const highlightService = useMemo(
    () => (servicesQ.data as Service[] | undefined)?.find((s) => s.id === highlightServiceId) ?? null,
    [servicesQ.data, highlightServiceId],
  );

  const allSuggestions = useMemo(
    () =>
      canEdit
        ? buildSlotSuggestions({
            date,
            employees: (employeesQ.data ?? []).filter(
              (employee) =>
                employee.isActive !== false &&
                (employee.showInCalendar !== false || matchesStaffFilter(employee, staffFilter)),
            ),
            appointments: activeAppointments,
            diagnosticPeriods: diagnosticPeriodsQ.data ?? [],
            absences: absencesForDay,
            rooms: roomsQ.data ?? [],
            service: highlightService,
            roomId: roomId || undefined,
            employeeId: staffFilter.employeeId,
            specialtyId: staffFilter.specialtyId,
            clientId: highlightClientId || undefined,
            clientBirthDate: ((clientsQ.data ?? []) as Client[]).find((client) => client.id === highlightClientId)
              ?.birthDate,
            limit: 500,
          })
        : [],
    [canEdit, date, employeesQ.data, activeAppointments, diagnosticPeriodsQ.data, absencesForDay, roomsQ.data, highlightService, roomId, staffFilter, highlightClientId, clientsQ.data],
  );

  const highlightEmployee = useMemo(
    () =>
      staffFilter.employeeId
        ? (employeesQ.data ?? []).find((e) => e.id === staffFilter.employeeId) ?? null
        : null,
    [employeesQ.data, staffFilter.employeeId],
  );

  const highlightStaffName = useMemo(
    () => staffFilterLabel(employeeId, employeesQ.data ?? [], specialtiesQ.data ?? []),
    [employeeId, employeesQ.data, specialtiesQ.data],
  );

  const highlightClient = useMemo(
    () => ((clientsQ.data ?? []) as Client[]).find((client) => client.id === highlightClientId) ?? null,
    [clientsQ.data, highlightClientId],
  );

  const suggestions = useMemo(() => {
    const list = staffFilter.specialtyId ? pickUniqueSuggestionsByTime(allSuggestions) : allSuggestions;
    return list.slice(0, 8);
  }, [allSuggestions, staffFilter.specialtyId]);

  const pickSuggestion = (suggestion: SlotSuggestion) => {
    if (!canEdit) return;
    setDraft({
      employeeId: suggestion.employee.id,
      employeeName: suggestion.employee.shortName,
      date,
      startMin: suggestion.startMin,
      endMin: suggestion.endMin,
      serviceId: highlightService?.id,
      roomId: suggestion.room?.id,
      clientId: highlightClientId || undefined,
      joinGroupSessionId: suggestion.groupSessionId,
      // При фильтре по специальности специалиста можно сменить.
      allowPickSlot: !!staffFilter.specialtyId,
    });
  };

  const openGroup = async (appointments: Appointment[]) => {
    const primary = appointments[0];
    if (!primary) return;
    const groupSessionId = primary.groupSessionId;
    const members = groupSessionId
      ? await fetchGroupSessionMembers(groupSessionId, appointments)
      : appointments;
    const anchor = members[0] ?? primary;
    const employee = (employeesQ.data ?? []).find((item) => item.id === anchor.employee.id);
    setDraft({
      employeeId: anchor.employee.id,
      employeeName: employee?.shortName ?? anchor.employee.shortName,
      date: anchor.date.slice(0, 10),
      startMin: anchor.startMin,
      endMin: anchor.endMin,
      serviceId: anchor.service.id,
      roomId: anchor.room?.id,
      joinGroupSessionId: groupSessionId ?? undefined,
      groupMembers: members,
      attendanceOnly: canMarkAttendance,
    });
  };

  const joinGroupFromCalendar = (appointments: Appointment[]) => {
    if (!canEdit || !highlightService?.isGroup) return;
    const primary = appointments[0];
    if (!primary?.groupSessionId) return;
    const visual = resolveGroupJoinVisual({
      highlightService,
      highlightClientId,
      highlightClientBirthDate: highlightClient?.birthDate,
      members: appointments,
      dayAppointments: activeAppointments,
    });
    if (visual === "conflict") {
      toast({ tone: "error", title: "Клиент занят в это время" });
      return;
    }
    if (visual !== "available") return;
    const employee = (employeesQ.data ?? []).find((item) => item.id === primary.employee.id);
    setDraft({
      employeeId: primary.employee.id,
      employeeName: employee?.shortName ?? primary.employee.shortName,
      date,
      startMin: primary.startMin,
      endMin: primary.endMin,
      serviceId: highlightService.id,
      roomId: primary.room?.id,
      clientId: highlightClientId || undefined,
      joinGroupSessionId: primary.groupSessionId,
    });
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["appointments", date] });
    qc.invalidateQueries({ queryKey: ["diagnostic-periods", date] });
    qc.invalidateQueries({ queryKey: ["load", date] });
    qc.invalidateQueries({ queryKey: ["absences"] });
  };

  const { push: pushUndo, undo: undoLastAction } = useClientScheduleUndo(refresh);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (!isUndoShortcut(event)) return;
      if (draft) return;
      event.preventDefault();
      void undoLastAction();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draft, undoLastAction]);

  const moveAppt = useMutation({
    mutationFn: ({ id, employeeId, startMin }: { id: string; employeeId: string; startMin: number }) =>
      api.patch(`/api/appointments/${id}`, { employeeId, startMin }),
    onSuccess: () => {
      refresh();
      toast({ tone: "success", title: "Запись перенесена" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось перенести", message: mutationErrorMessage(e) }),
  });

  const loading = employeesQ.isLoading || appointmentsQ.isLoading || diagnosticPeriodsQ.isLoading || clinicDaysQ.isLoading;

  const clinicGridRange = useMemo(() => {
    const openDays = (clinicDaysQ.data ?? []).filter((day) => day.isOpen);
    if (openDays.length === 0) return { startMin: 540, endMin: 1080 };
    return {
      startMin: Math.min(...openDays.map((day) => day.startMin)),
      endMin: Math.max(...openDays.map((day) => day.endMin)),
    };
  }, [clinicDaysQ.data]);

  const hasEmployees = (employeesQ.data?.length ?? 0) > 0;

  const visibleEmployees = useMemo(() => {
    const list = (employeesQ.data ?? []).filter((employee) => employee.isActive !== false);
    if (staffFilter.employeeId) {
      const selected = list.find((employee) => employee.id === staffFilter.employeeId);
      return selected ? [selected] : [];
    }
    if (staffFilter.specialtyId) {
      return list.filter((employee) => employee.specialtyId === staffFilter.specialtyId);
    }
    return list.filter((employee) => employee.showInCalendar !== false);
  }, [employeesQ.data, staffFilter]);

  const columnWidth = useMemo(
    () => (visibleEmployees.length === 1 ? preferences.focusedColumnWidth : preferences.columnWidth),
    [preferences.columnWidth, preferences.focusedColumnWidth, visibleEmployees.length],
  );

  return {
    user,
    canEdit,
    readOnly,
    employeeDeleted,
    canMarkAttendance,
    canCreateAbsence,
    absenceOnlyClicks,
    preferences,
    saveDisplayPreferences,
    date,
    setDate,
    highlightServiceId,
    setHighlightServiceId,
    highlightClientId,
    setHighlightClientId,
    employeeId,
    setEmployeeId,
    roomId,
    setRoomId,
    draft,
    setDraft,
    printOpen,
    setPrintOpen,
    dayPrintOpen,
    setDayPrintOpen,
    displaySettingsOpen,
    setDisplaySettingsOpen,
    employeesQ,
    specialtiesQ,
    appointmentsQ,
    diagnosticPeriodsQ,
    loadQ,
    servicesQ,
    clientsQ,
    roomsQ,
    absencesQ,
    clinicDaysQ,
    absencesForDay,
    activeAppointments,
    highlightService,
    allSuggestions,
    highlightEmployee,
    highlightStaffName,
    highlightClient,
    suggestions,
    pickSuggestion,
    openGroup,
    joinGroupFromCalendar,
    refresh,
    pushUndo,
    moveAppt,
    loading,
    clinicGridRange,
    hasEmployees,
    visibleEmployees,
    columnWidth,
  };
}
