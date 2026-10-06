import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { resources } from "../lib/resources";
import {
  clampClientScheduleEndDate,
  datesInRange,
  defaultClientScheduleRange,
} from "../lib/client-schedule-range";
import type { Absence, Appointment, Client, ClinicWorkDay, Employee, Service, Specialty } from "../lib/types";
import type { JoinableGroupSlot } from "../components/ClientScheduleDayList";
import { fetchCoStaffSessionMembers, fetchGroupSessionMembers } from "../lib/group-session-members";
import { buildSlotSuggestions, pickUniqueSuggestionsByTime, type SlotSuggestion } from "../lib/slot-suggestions";
import { getClientConflict } from "../lib/conflicts";
import { clientFitsGroupAgeRange, groupAgeRangeLabel } from "../lib/group-age";
import { clientAlreadyInGroup, findOpenGroupSessions } from "../lib/group-sessions";
import { parseStaffFilter, staffFilterLabel } from "../lib/staff-filter";
import { useClientSchedule } from "./useClientSchedule";
import { useClientSchedulePreferences } from "./useClientSchedulePreferences";
import {
  useScheduleDayDiagnosticPeriods,
  useScheduleDaysAppointments,
  useScheduleDaysDiagnosticPeriods,
} from "./useScheduleDaysData";
import type { SlotDraft } from "../types/slot-draft";
import { mutationErrorMessage, useToast } from "../components/feedback";
import { findAppointmentById } from "../lib/client-schedule-undo";
import { useClientScheduleUndo } from "./useClientScheduleUndo";
import type { ClientJoinableGroup } from "../components/client-schedule/ClientJoinableGroupBlock";

export function useClientSchedulePage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = defaultClientScheduleRange();

  const [clientId, setClientIdState] = useState(() => searchParams.get("clientId") ?? "");
  const [startDate, setStartDateState] = useState(() => searchParams.get("startDate") ?? defaults.startDate);
  const [endDate, setEndDateState] = useState(() => searchParams.get("endDate") ?? defaults.endDate);
  const [activeDay, setActiveDay] = useState(() => searchParams.get("startDate") ?? defaults.startDate);
  const [employeeId, setEmployeeId] = useState("");
  const [highlightServiceId, setHighlightServiceId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [draft, setDraft] = useState<SlotDraft | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);
  const { preferences: displayPreferences, save: saveDisplayPreferences } = useClientSchedulePreferences();

  const setClientId = (next: string) => {
    setClientIdState(next);
    syncParams({ clientId: next });
  };

  const setStartDate = (next: string) => {
    const clampedEnd = clampClientScheduleEndDate(next, endDate);
    setStartDateState(next);
    if (clampedEnd !== endDate) setEndDateState(clampedEnd);
    if (activeDay < next) setActiveDay(next);
    syncParams({ startDate: next, endDate: clampedEnd !== endDate ? clampedEnd : endDate });
  };

  const setEndDate = (next: string) => {
    const clampedEnd = clampClientScheduleEndDate(startDate, next);
    setEndDateState(clampedEnd);
    if (activeDay > clampedEnd) setActiveDay(clampedEnd);
    syncParams({ endDate: clampedEnd });
  };

  const syncParams = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    const merged = {
      clientId,
      startDate,
      endDate,
      ...patch,
    };
    if (merged.clientId) params.set("clientId", merged.clientId);
    else params.delete("clientId");
    params.set("startDate", merged.startDate);
    params.set("endDate", merged.endDate);
    setSearchParams(params, { replace: true });
  };

  const resetRange = () => {
    const range = defaultClientScheduleRange();
    setStartDateState(range.startDate);
    setEndDateState(range.endDate);
    setActiveDay(range.startDate);
    syncParams({ startDate: range.startDate, endDate: range.endDate });
  };

  const dayDates = useMemo(() => datesInRange(startDate, endDate), [startDate, endDate]);

  useEffect(() => {
    if (!dayDates.length) return;
    if (!dayDates.includes(activeDay)) setActiveDay(dayDates[0]!);
  }, [activeDay, dayDates]);

  const clientsQ = useQuery({
    queryKey: ["clients"],
    queryFn: () => resources.clients.list(false) as Promise<Client[]>,
  });

  const servicesQ = useQuery({
    queryKey: ["services"],
    queryFn: () => resources.services.list(false) as Promise<Service[]>,
  });

  const roomsQ = useQuery({
    queryKey: ["rooms"],
    queryFn: () => resources.rooms.list(false),
  });

  const employeesQ = useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await api.get<Employee[]>("/api/employees")).data,
  });

  const specialtiesQ = useQuery({
    queryKey: ["specialties"],
    queryFn: () => resources.specialties.list() as Promise<Specialty[]>,
  });

  const staffFilter = useMemo(() => parseStaffFilter(employeeId), [employeeId]);

  const absencesQ = useQuery({
    queryKey: ["absences"],
    queryFn: resources.absences.list,
  });

  const scheduleQ = useClientSchedule(clientId, startDate, endDate);
  const { byDate: appointmentsByDate, isLoading: appointmentsLoading } = useScheduleDaysAppointments(dayDates);
  const { byDate: diagnosticPeriodsByDate, isLoading: diagnosticLoading } = useScheduleDaysDiagnosticPeriods(dayDates);
  const draftDate = draft?.date ?? "";
  const draftDiagnosticPeriodsQ = useScheduleDayDiagnosticPeriods(draftDate);

  const clinicDaysQ = useQuery({
    queryKey: ["clinic-work-days"],
    queryFn: () => resources.settings.clinicWorkDays() as Promise<ClinicWorkDay[]>,
  });

  const absencesForDate = (date: string) => {
    if (!date) return [];
    const day = parseISO(date);
    return (absencesQ.data ?? []).filter((absence: Absence) => {
      const start = parseISO(absence.startDate.slice(0, 10));
      const end = parseISO(absence.endDate.slice(0, 10));
      return day >= start && day <= end;
    });
  };

  const absencesForActiveDay = useMemo(() => absencesForDate(activeDay), [absencesQ.data, activeDay]);

  const highlightService = useMemo(
    () => (servicesQ.data ?? []).find((service) => service.id === highlightServiceId) ?? null,
    [highlightServiceId, servicesQ.data],
  );
  const highlightEmployee = useMemo(
    () =>
      staffFilter.employeeId
        ? (employeesQ.data ?? []).find((employee) => employee.id === staffFilter.employeeId) ?? null
        : null,
    [employeesQ.data, staffFilter.employeeId],
  );

  const highlightStaffName = useMemo(
    () => staffFilterLabel(employeeId, employeesQ.data ?? [], specialtiesQ.data ?? []),
    [employeeId, employeesQ.data, specialtiesQ.data],
  );
  const selectedClient = useMemo(
    () => clientsQ.data?.find((client) => client.id === clientId),
    [clientId, clientsQ.data],
  );

  const joinableGroupsByDate = useMemo(() => {
    const map = new Map<string, JoinableGroupSlot[]>();
    if (!clientId || !highlightService?.isGroup) return map;

    for (const date of dayDates) {
      const dayAppointments = appointmentsByDate.get(date) ?? [];
      const joinable = findOpenGroupSessions({
        appointments: dayAppointments,
        serviceId: highlightService.id,
        employeeId: staffFilter.employeeId,
        date,
      })
        .filter((group) => {
          if (!staffFilter.specialtyId) return true;
          const employee = employeesQ.data?.find((item) => item.id === group.appointment.employee.id);
          return employee?.specialtyId === staffFilter.specialtyId;
        })
        .filter((group) => !clientAlreadyInGroup(clientId, group.members))
        .filter((group) =>
          clientFitsGroupAgeRange(
            selectedClient?.birthDate,
            group.appointment.groupAgeRange,
            date,
          ),
        )
        .filter(
          (group) =>
            !getClientConflict({
              clientId,
              interval: { startMin: group.appointment.startMin, endMin: group.appointment.endMin },
              appointments: dayAppointments.filter(
                (appointment) => appointment.groupSessionId !== group.groupSessionId,
              ),
            }),
        )
        .map((group) => ({
          groupSessionId: group.groupSessionId,
          startMin: group.appointment.startMin,
          endMin: group.appointment.endMin,
          employee: group.appointment.employee,
          roomName: group.appointment.room?.name,
          groupSize: group.members.length,
          groupAgeRangeLabel: groupAgeRangeLabel(group.appointment.groupAgeRange) || undefined,
        }));

      if (joinable.length) map.set(date, joinable);
    }

    return map;
  }, [appointmentsByDate, clientId, dayDates, employeesQ.data, highlightService, selectedClient?.birthDate, staffFilter]);

  const suggestions = useMemo(() => {
    if (!clientId || !activeDay || !highlightService) return [];
    const joinable = joinableGroupsByDate.get(activeDay) ?? [];
    const dayAppointments = appointmentsByDate.get(activeDay) ?? [];
    return pickUniqueSuggestionsByTime(
      buildSlotSuggestions({
        date: activeDay,
        employees: employeesQ.data ?? [],
        appointments: dayAppointments,
        diagnosticPeriods: diagnosticPeriodsByDate.get(activeDay) ?? [],
        absences: absencesForActiveDay,
        rooms: roomsQ.data ?? [],
        service: highlightService,
        roomId: roomId || undefined,
        employeeId: staffFilter.employeeId,
        specialtyId: staffFilter.specialtyId,
        clientId,
        clientBirthDate: selectedClient?.birthDate,
        limit: 500,
      }),
      8,
    ).filter((suggestion) => {
      const interval = { startMin: suggestion.startMin, endMin: suggestion.endMin };
      if (getClientConflict({ clientId, interval, appointments: dayAppointments })) return false;
      return !joinable.some(
        (group) =>
          suggestion.startMin < group.endMin && group.startMin < suggestion.endMin,
      );
    });
  }, [
    absencesForActiveDay,
    activeDay,
    appointmentsByDate,
    clientId,
    diagnosticPeriodsByDate,
    staffFilter,
    employeesQ.data,
    highlightService,
    joinableGroupsByDate,
    roomId,
    roomsQ.data,
    selectedClient?.birthDate,
  ]);

  const refresh = () => {
    if (clientId) qc.invalidateQueries({ queryKey: ["client-schedule", clientId] });
    dayDates.forEach((date) => {
      qc.invalidateQueries({ queryKey: ["appointments", date] });
      qc.invalidateQueries({ queryKey: ["diagnostic-periods", date] });
    });
  };

  const { push: pushUndo, undo: undoLastAction } = useClientScheduleUndo(refresh);

  const moveAppt = useMutation({
    mutationFn: ({ id, date, startMin }: { id: string; date: string; startMin: number }) =>
      api.patch(`/api/appointments/${id}`, { date, startMin }),
    onSuccess: (_, vars) => {
      refresh();
      setActiveDay(vars.date);
      toast({ tone: "success", title: "Запись перенесена" });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось перенести", message: mutationErrorMessage(e) }),
  });

  const duplicateAppt = useMutation({
    mutationFn: (payload: {
      date: string;
      startMin: number;
      clientId: string;
      employeeId: string;
      serviceId: string;
      roomId?: string;
      note?: string;
    }) => api.post<Appointment>("/api/appointments", payload),
    onSuccess: (response, vars) => {
      pushUndo({ kind: "create", appointmentId: response.data.id });
      refresh();
      setActiveDay(vars.date);
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось создать копию", message: mutationErrorMessage(e) }),
  });

  const handleMoveAppointment = (id: string, date: string, startMin: number) => {
    const existing = findAppointmentById(appointmentsByDate, id);
    moveAppt.mutate(
      { id, date, startMin },
      {
        onSuccess: () => {
          if (!existing) return;
          pushUndo({
            kind: "move",
            appointmentId: id,
            date: existing.date.slice(0, 10),
            startMin: existing.startMin,
          });
        },
      },
    );
  };

  const selectDay = (date: string) => {
    setActiveDay(date);
  };

  const openAdd = (date: string, startMin: number) => {
    if (!clientId) return;
    setActiveDay(date);
    const employee = staffFilter.employeeId
      ? employeesQ.data?.find((item) => item.id === staffFilter.employeeId)
      : undefined;
    setDraft({
      date,
      clientId,
      employeeId: staffFilter.employeeId || "",
      employeeName: employee?.shortName ?? "",
      startMin,
      serviceId: highlightServiceId || undefined,
      roomId: roomId || undefined,
      allowPickSlot: !staffFilter.employeeId,
    });
  };

  const pickSuggestion = (suggestion: SlotSuggestion, date = activeDay) => {
    if (!clientId || !date) return;
    setActiveDay(date);
    if (staffFilter.employeeId) {
      const employee = employeesQ.data?.find((item) => item.id === staffFilter.employeeId);
      setDraft({
        employeeId: staffFilter.employeeId,
        employeeName: employee?.shortName ?? "",
        date,
        startMin: suggestion.startMin,
        endMin: suggestion.endMin,
        serviceId: highlightService?.id,
        roomId: suggestion.room?.id ?? (roomId || undefined),
        clientId,
        allowPickSlot: false,
        joinGroupSessionId: suggestion.groupSessionId,
      });
      return;
    }
    if (staffFilter.specialtyId) {
      // Подставляем лучшего специалиста, но оставляем возможность сменить.
      setDraft({
        employeeId: suggestion.employee.id,
        employeeName: suggestion.employee.shortName,
        date,
        startMin: suggestion.startMin,
        endMin: suggestion.endMin,
        serviceId: highlightService?.id,
        roomId: suggestion.room?.id ?? (roomId || undefined),
        clientId,
        allowPickSlot: true,
        joinGroupSessionId: suggestion.groupSessionId,
      });
      return;
    }

    setDraft({
      employeeId: "",
      employeeName: "",
      date,
      startMin: suggestion.startMin,
      endMin: suggestion.endMin,
      serviceId: highlightService?.id,
      roomId: suggestion.room?.id ?? (roomId || undefined),
      clientId,
      allowPickSlot: true,
      joinGroupSessionId: suggestion.groupSessionId,
    });
  };

  const joinGroup = (group: JoinableGroupSlot, date: string) => {
    if (!clientId) return;
    const employee = employeesQ.data?.find((item) => item.id === group.employee.id);
    setActiveDay(date);
    setDraft({
      employeeId: group.employee.id,
      employeeName: employee?.shortName ?? group.employee.shortName,
      date,
      startMin: group.startMin,
      endMin: group.endMin,
      serviceId: highlightService?.id,
      clientId,
      joinGroupSessionId: group.groupSessionId,
    });
  };

  const joinGroupFromCalendar = (group: ClientJoinableGroup, date: string) => {
    joinGroup(
      {
        groupSessionId: group.groupSessionId,
        startMin: group.startMin,
        endMin: group.endMin,
        employee: { id: group.employeeId, shortName: group.employeeName },
        roomName: group.roomName,
        groupSize: group.groupSize,
      },
      date,
    );
  };

  const openGroup = async (appointments: Appointment[]) => {
    const primary = appointments[0];
    if (!primary) return;
    const groupSessionId = primary.groupSessionId;
    const members = groupSessionId
      ? await fetchGroupSessionMembers(groupSessionId, appointments)
      : appointments;
    const anchor = members[0] ?? primary;
    const employee = employeesQ.data?.find((item) => item.id === anchor.employee.id);
    const date = anchor.date.slice(0, 10);
    setActiveDay(date);
    setDraft({
      employeeId: anchor.employee.id,
      employeeName: employee?.shortName ?? anchor.employee.shortName,
      date,
      startMin: anchor.startMin,
      endMin: anchor.endMin,
      serviceId: anchor.service.id,
      roomId: anchor.room?.id,
      clientId: anchor.client.id,
      joinGroupSessionId: groupSessionId ?? undefined,
      groupMembers: members,
    });
  };

  const openAppointment = async (appointment: Appointment) => {
    const employee = employeesQ.data?.find((item) => item.id === appointment.employee.id);
    setActiveDay(appointment.date.slice(0, 10));

    if (appointment.groupSessionId && appointment.service.isGroup) {
      await openGroup([appointment]);
      return;
    }

    if (appointment.coStaffSessionId) {
      const members = await fetchCoStaffSessionMembers(appointment.coStaffSessionId, [appointment]);
      const uniqueClients = [...new Set(members.map((member) => member.client.id))];
      if (uniqueClients.length > 1 || members[0]?.service.isGroup) {
        setDraft({
          employeeId: appointment.employee.id,
          employeeName: employee?.shortName ?? appointment.employee.shortName,
          date: appointment.date.slice(0, 10),
          startMin: appointment.startMin,
          endMin: appointment.endMin,
          serviceId: appointment.service.id,
          roomId: appointment.room?.id,
          clientId: appointment.client.id,
          joinGroupSessionId: appointment.groupSessionId ?? undefined,
          groupMembers: members,
        });
        return;
      }
    }

    setDraft({
      employeeId: appointment.employee.id,
      employeeName: employee?.shortName ?? appointment.employee.shortName,
      date: appointment.date.slice(0, 10),
      startMin: appointment.startMin,
      clientId: appointment.client.id,
      appointment,
    });
  };

  const loading = scheduleQ.isLoading || appointmentsLoading || diagnosticLoading || clinicDaysQ.isLoading;
  const activeJoinableGroups = joinableGroupsByDate.get(activeDay) ?? [];

  return {
    clientId,
    setClientId,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    resetRange,
    activeDay,
    employeeId,
    setEmployeeId,
    highlightServiceId,
    setHighlightServiceId,
    roomId,
    setRoomId,
    draft,
    setDraft,
    printOpen,
    setPrintOpen,
    displaySettingsOpen,
    setDisplaySettingsOpen,
    displayPreferences,
    saveDisplayPreferences,
    dayDates,
    clientsQ,
    servicesQ,
    roomsQ,
    employeesQ,
    specialtiesQ,
    absencesQ,
    scheduleQ,
    clinicDaysQ,
    appointmentsByDate,
    diagnosticPeriodsByDate,
    draftDiagnosticPeriodsQ,
    absencesForDate,
    highlightService,
    highlightEmployee,
    highlightStaffName,
    suggestions,
    joinableGroupsByDate,
    activeJoinableGroups,
    refresh,
    pushUndo,
    duplicateAppt,
    handleMoveAppointment,
    selectDay,
    openAdd,
    pickSuggestion,
    joinGroup,
    joinGroupFromCalendar,
    openGroup,
    openAppointment,
    undoLastAction,
    loading,
    selectedClient,
  };
}
