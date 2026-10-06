import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { minToTime, timeToMin } from "../../lib/format";
import type { Absence, AbsenceType, Appointment, Client, DiagnosticPeriod, Employee, Room, Service } from "../../lib/types";
import { resolveRoomId } from "../../lib/room-selection";
import { getAbsenceConflict, getAppointmentConflict, getClientConflict } from "../../lib/conflicts";
import { buildSlots } from "../../lib/time";
import type { SlotDraft } from "../../types/slot-draft";
import { useRoomConflictOptions } from "../../hooks/useRoomConflictOptions";
import { useClientConflictOptions } from "../../hooks/useClientConflictOptions";
import { useEmployeeConflictOptions } from "../../hooks/useEmployeeConflictOptions";
import { useTimeConflictOptions } from "../../hooks/useTimeConflictOptions";
import { clientFitsGroupAgeRange, groupAgeRangeFromBirthDate, type GroupAgeRange } from "../../lib/group-age";

export interface AppointmentPopoverStateParams {
  draft: SlotDraft | null;
  clients: Client[];
  services: Service[];
  rooms: Room[];
  employees: Employee[];
  appointments: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  absences: Absence[];
  fixedClientId?: string;
  fixedRoomId?: string;
  allowEditSlot?: boolean;
  allowAbsenceCreate?: boolean;
}

export function useAppointmentPopoverState({
  draft,
  clients,
  services,
  rooms,
  employees,
  appointments,
  diagnosticPeriods = [],
  absences,
  fixedClientId,
  fixedRoomId = "",
  allowEditSlot = false,
  allowAbsenceCreate = false,
}: AppointmentPopoverStateParams) {
  const [clientIds, setClientIds] = useState<string[]>([""]);
  const [serviceId, setServiceId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [note, setNote] = useState("");
  const [clientNoShow, setClientNoShow] = useState<boolean | null>(null);
  const [groupMemberNoShow, setGroupMemberNoShow] = useState<Record<string, boolean | null>>({});
  const [apiError, setApiError] = useState("");
  const [pickedEmployeeId, setPickedEmployeeId] = useState("");
  const [staffEmployeeIds, setStaffEmployeeIds] = useState<string[]>([""]);
  const [pickedStartMin, setPickedStartMin] = useState(540);
  const [groupMembers, setGroupMembers] = useState<Appointment[]>([]);
  const [newGroupClientIds, setNewGroupClientIds] = useState<string[]>([]);
  const [createMode, setCreateMode] = useState<"appointment" | "absence">("appointment");
  const [absenceType, setAbsenceType] = useState<AbsenceType>("SICK");
  const [absenceStartDate, setAbsenceStartDate] = useState("");
  const [absenceEndDate, setAbsenceEndDate] = useState("");
  const [absenceAllDay, setAbsenceAllDay] = useState(false);
  const [absenceStartTime, setAbsenceStartTime] = useState("09:00");
  const [absenceEndTime, setAbsenceEndTime] = useState("10:00");
  const [absenceNote, setAbsenceNote] = useState("");

  const isAbsenceEdit = !!draft?.absence;
  const effectiveGroupSessionId =
    draft?.joinGroupSessionId ??
    (draft?.appointment?.service.isGroup ? draft.appointment.groupSessionId ?? undefined : undefined) ??
    (draft?.groupMembers?.[0]?.service.isGroup
      ? draft.groupMembers[0].groupSessionId ?? undefined
      : undefined);
  /** Группа: явный groupMembers в draft ИЛИ одиночная карточка групповой услуги с groupSessionId. */
  const isGroupEdit = !!(
    effectiveGroupSessionId &&
    (draft?.groupMembers?.length || (draft?.appointment?.service.isGroup && draft.appointment.groupSessionId))
  );
  const isEdit = !!draft?.appointment && !isGroupEdit;
  const isDiagnosticBooking = !!(
    draft?.appointment?.diagnosticPeriodId ||
    draft?.groupMembers?.some((member) => member.diagnosticPeriodId)
  );
  const attendanceOnly = !!draft?.attendanceOnly;
  const isJoinGroup = !!draft?.joinGroupSessionId && !isGroupEdit && !isEdit;
  const absenceOnly = !!draft?.absenceOnly;
  const showAbsenceMode =
    allowAbsenceCreate &&
    !isEdit &&
    !isAbsenceEdit &&
    !isJoinGroup &&
    !isGroupEdit &&
    !attendanceOnly &&
    !!draft &&
    !absenceOnly;
  const isAbsenceMode = isAbsenceEdit || absenceOnly || (showAbsenceMode && createMode === "absence");
  const lockAbsenceEmployee = absenceOnly || isAbsenceEdit;
  const canPickSlot = !!draft?.allowPickSlot && !isEdit && !isJoinGroup && !isGroupEdit && !absenceOnly;
  const canChangeSlot =
    !isDiagnosticBooking &&
    (canPickSlot || (allowEditSlot && (isEdit || isGroupEdit) && !isJoinGroup));
  const effectiveStaffIds = useMemo(() => {
    if (isAbsenceMode) {
      const id =
        lockAbsenceEmployee ? draft?.employeeId ?? "" : canChangeSlot ? pickedEmployeeId : draft?.employeeId ?? "";
      return id ? [id] : [];
    }
    if (canChangeSlot || isEdit || isGroupEdit) {
      return [...new Set(staffEmployeeIds.map((id) => id.trim()).filter(Boolean))];
    }
    const fallback = draft?.employeeId ?? draft?.appointment?.employee.id ?? "";
    return fallback ? [fallback] : [];
  }, [
    canChangeSlot,
    draft?.appointment?.employee.id,
    draft?.employeeId,
    isAbsenceMode,
    isEdit,
    isGroupEdit,
    lockAbsenceEmployee,
    pickedEmployeeId,
    staffEmployeeIds,
  ]);
  const effectiveEmployeeId = effectiveStaffIds[0] ?? "";
  const effectiveStartMin = canChangeSlot
    ? pickedStartMin
    : isEdit
      ? draft!.appointment!.startMin
      : draft?.startMin ?? 540;
  const sessionExcludeIds = useMemo(() => {
    const ids = new Set<string>();
    if (draft?.appointment?.id) ids.add(draft.appointment.id);
    for (const member of groupMembers) ids.add(member.id);
    for (const member of draft?.groupMembers ?? []) ids.add(member.id);
    const coStaffId = draft?.appointment?.coStaffSessionId ?? draft?.groupMembers?.[0]?.coStaffSessionId;
    if (coStaffId) {
      for (const appointment of appointments) {
        if (appointment.coStaffSessionId === coStaffId) ids.add(appointment.id);
      }
    }
    return [...ids];
  }, [appointments, draft?.appointment, draft?.groupMembers, groupMembers]);

  const lockedClientId = fixedClientId || draft?.clientId;
  const lockedClient = clients.find((client) => client.id === lockedClientId);
  const activeClientIds = useMemo(() => {
    if (isGroupEdit) {
      return [
        ...groupMembers.map((member) => member.client.id),
        ...newGroupClientIds.map((id) => id.trim()).filter(Boolean),
      ];
    }
    return clientIds.map((id) => id.trim()).filter(Boolean);
  }, [clientIds, groupMembers, isGroupEdit, newGroupClientIds]);
  const excludeAppointmentIds = sessionExcludeIds;

  /** Стабильный ключ открытия карточки: не зависит от refetch appointments (иначе откатывает «Убрать»). */
  const draftSeedKey = useMemo(() => {
    if (!draft) return null;
    if (draft.absence) return `absence:${draft.absence.id}`;
    if (draft.groupMembers?.length) {
      const sessionId =
        draft.joinGroupSessionId ??
        draft.groupMembers[0]?.groupSessionId ??
        draft.groupMembers.map((member) => member.id).join(",");
      return `group:${sessionId}:${draft.date}:${draft.startMin}:${draft.employeeId ?? ""}`;
    }
    if (draft.appointment) {
      return `appt:${draft.appointment.id}`;
    }
    return [
      "create",
      draft.date,
      draft.startMin ?? "",
      draft.endMin ?? "",
      draft.employeeId ?? "",
      draft.clientId ?? "",
      draft.joinGroupSessionId ?? "",
      draft.serviceId ?? "",
      draft.roomId ?? "",
      draft.absenceOnly ? "absence" : "",
      draft.allowPickSlot ? "pick" : "",
    ].join(":");
  }, [draft]);

  useEffect(() => {
    if (!draft) {
      setGroupMembers([]);
      setNewGroupClientIds([]);
      setCreateMode("appointment");
      return;
    }
    setApiError("");
    setCreateMode(draft.absenceOnly || draft.absence ? "absence" : "appointment");
    if (draft.absence) {
      const absence = draft.absence;
      setGroupMembers([]);
      setNewGroupClientIds([]);
      setPickedEmployeeId(absence.employeeId);
      setStaffEmployeeIds([absence.employeeId]);
      setAbsenceType(absence.type);
      setAbsenceStartDate(absence.startDate.slice(0, 10));
      setAbsenceEndDate(absence.endDate.slice(0, 10));
      const hasTime = absence.startMin != null && absence.endMin != null;
      setAbsenceAllDay(!hasTime);
      setAbsenceStartTime(hasTime ? minToTime(absence.startMin!) : minToTime(draft.startMin ?? 540));
      setAbsenceEndTime(hasTime ? minToTime(absence.endMin!) : minToTime(draft.endMin ?? (draft.startMin ?? 540) + 60));
      setAbsenceNote(absence.note ?? "");
    } else if (draft.appointment) {
      if (draft.appointment.service.isGroup && draft.appointment.groupSessionId) {
        const seedMembers = draft.groupMembers?.length ? draft.groupMembers : [draft.appointment];
        const members = [...seedMembers].sort((a, b) =>
          a.client.fullName.localeCompare(b.client.fullName, "ru"),
        );
        const uniqueClients = new Map<string, Appointment>();
        for (const member of members) {
          if (!uniqueClients.has(member.client.id)) uniqueClients.set(member.client.id, member);
        }
        const clientRows = [...uniqueClients.values()];
        const anchor = clientRows[0] ?? draft.appointment;
        setGroupMembers(clientRows);
        setNewGroupClientIds([]);
        setGroupMemberNoShow(
          Object.fromEntries(clientRows.map((member) => [member.id, member.clientNoShow ?? null])),
        );
        setClientIds(clientRows.map((member) => member.client.id));
        setServiceId(draft.serviceId ?? anchor.service.id);
        setRoomId(draft.roomId ?? anchor.room?.id ?? "");
        setNote(anchor.note ?? "");
        setClientNoShow(null);
        setPickedEmployeeId(draft.employeeId || anchor.employee.id);
        setStaffEmployeeIds([...new Set(members.map((member) => member.employee.id))]);
        setPickedStartMin(draft.startMin ?? anchor.startMin);
      } else {
        setGroupMembers([]);
        setNewGroupClientIds([]);
        setClientIds([draft.appointment.client.id]);
        setServiceId(draft.appointment.service.id);
        setRoomId(draft.appointment.room?.id ?? "");
        setNote(draft.appointment.note ?? "");
        setClientNoShow(draft.appointment.clientNoShow ?? null);
        setGroupMemberNoShow({});
        setPickedEmployeeId(draft.appointment.employee.id);
        setStaffEmployeeIds([draft.appointment.employee.id]);
        setPickedStartMin(draft.appointment.startMin);
      }
    } else if (draft.groupMembers?.length) {
      const members = [...draft.groupMembers].sort((a, b) =>
        a.client.fullName.localeCompare(b.client.fullName, "ru"),
      );
      const anchor = members[0]!;
      const uniqueClients = new Map<string, Appointment>();
      for (const member of members) {
        if (!uniqueClients.has(member.client.id)) uniqueClients.set(member.client.id, member);
      }
      const clientRows = [...uniqueClients.values()];
      setGroupMembers(clientRows);
      setNewGroupClientIds([]);
      setGroupMemberNoShow(
        Object.fromEntries(clientRows.map((member) => [member.id, member.clientNoShow ?? null])),
      );
      setClientIds(clientRows.map((member) => member.client.id));
      setServiceId(draft.serviceId ?? anchor.service.id);
      setRoomId(draft.roomId ?? anchor.room?.id ?? "");
      setNote(anchor.note ?? "");
      setPickedEmployeeId(draft.employeeId || anchor.employee.id);
      setStaffEmployeeIds([...new Set(members.map((member) => member.employee.id))]);
      setPickedStartMin(draft.startMin ?? anchor.startMin);
    } else {
      setGroupMembers([]);
      setNewGroupClientIds([]);
      setClientIds([draft.clientId ?? lockedClientId ?? ""]);
      setServiceId(draft.serviceId ?? services[0]?.id ?? "");
      setRoomId(draft.roomId ?? "");
      setNote("");
      setClientNoShow(null);
      setGroupMemberNoShow({});
      setPickedEmployeeId(draft.employeeId ?? "");
      setStaffEmployeeIds([draft.employeeId ?? ""]);
      setPickedStartMin(draft.startMin ?? 540);
      const start = draft.startMin ?? 540;
      const end = draft.endMin ?? start + 60;
      setAbsenceType("SICK");
      setAbsenceStartDate(draft.date);
      setAbsenceEndDate(draft.date);
      setAbsenceAllDay(false);
      setAbsenceStartTime(minToTime(start));
      setAbsenceEndTime(minToTime(Math.max(end, start + 30)));
      setAbsenceNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только смена открытой карточки, не refetch расписания
  }, [draftSeedKey]);

  /** Со-специалисты подтягиваем из актуального расписания без полного ресида формы. */
  useEffect(() => {
    const appointment = draft?.appointment;
    if (!appointment?.coStaffSessionId || appointment.service.isGroup) return;
    const coStaffIds = [
      ...new Set(
        appointments
          .filter((item) => item.coStaffSessionId === appointment.coStaffSessionId)
          .map((item) => item.employee.id),
      ),
    ];
    if (!coStaffIds.length) return;
    setStaffEmployeeIds(coStaffIds);
  }, [appointments, draft?.appointment]);

  const today = format(new Date(), "yyyy-MM-dd");
  const absenceDay = absenceOnly && !isAbsenceEdit ? draft?.date ?? "" : absenceStartDate;
  const absenceDayEnd = absenceOnly && !isAbsenceEdit ? draft?.date ?? "" : absenceEndDate;
  const absenceDateError =
    absenceDay && absenceDay < today
      ? "Нельзя указать прошедшую дату"
      : absenceDayEnd && absenceDayEnd < today
        ? "Нельзя указать прошедшую дату"
        : absenceDay && absenceDayEnd && absenceDayEnd < absenceDay
          ? "Дата окончания раньше даты начала"
          : !absenceAllDay && timeToMin(absenceEndTime) <= timeToMin(absenceStartTime)
            ? "Время окончания должно быть позже начала"
            : "";

  const absenceConflict = useMemo(() => {
    if (!isAbsenceMode || !effectiveEmployeeId || !absenceDay || !absenceDayEnd || absenceDateError) return null;
    return getAbsenceConflict({
      employeeId: effectiveEmployeeId,
      startDate: absenceDay,
      endDate: absenceDayEnd,
      startMin: absenceAllDay ? null : timeToMin(absenceStartTime),
      endMin: absenceAllDay ? null : timeToMin(absenceEndTime),
      appointments,
    });
  }, [
    absenceAllDay,
    absenceDateError,
    absenceDay,
    absenceDayEnd,
    absenceEndTime,
    absenceStartTime,
    appointments,
    effectiveEmployeeId,
    isAbsenceMode,
  ]);

  const service = services.find((s) => s.id === serviceId);
  const supportsMultiClient = !!service?.isGroup && !isEdit;
  const employee = employees.find((e) => e.id === effectiveEmployeeId);
  const staffEmployees = useMemo(
    () =>
      effectiveStaffIds
        .map((id) => employees.find((item) => item.id === id))
        .filter((item): item is Employee => !!item),
    [effectiveStaffIds, employees],
  );
  const diagnosticEndMin =
    draft?.appointment?.endMin ??
    draft?.groupMembers?.[0]?.endMin ??
    null;
  const endMin = isDiagnosticBooking && diagnosticEndMin != null
    ? diagnosticEndMin
    : service
      ? effectiveStartMin + service.durationMin
      : effectiveStartMin + 30;
  const interval = useMemo(() => ({ startMin: effectiveStartMin, endMin }), [effectiveStartMin, endMin]);
  const coStaffSessionId =
    draft?.appointment?.coStaffSessionId ?? draft?.groupMembers?.[0]?.coStaffSessionId ?? undefined;
  const staffLabel = staffEmployees.map((item) => item.shortName).join(", ") || "Специалист не выбран";

  useEffect(() => {
    if (!draft || isJoinGroup || isGroupEdit || !employee || !service || service.isGroup) return;
    if (isDiagnosticBooking) return;
    if (isEdit && !allowEditSlot) return;

    const nextRoomId = resolveRoomId({
      rooms,
      interval,
      appointments,
      isGroupService: service.isGroup,
      fixedRoomId: fixedRoomId || undefined,
      preferredRoomId: employee.defaultRoomId ?? undefined,
      excludeAppointmentId: draft.appointment?.id,
      excludeAppointmentIds,
    });

    setRoomId(nextRoomId);
  }, [
    allowEditSlot,
    appointments,
    draft,
    employee,
    excludeAppointmentIds,
    fixedRoomId,
    interval,
    isDiagnosticBooking,
    isEdit,
    isGroupEdit,
    isJoinGroup,
    rooms,
    service,
  ]);

  const { options: roomOptions } = useRoomConflictOptions({
    rooms,
    interval,
    appointments,
    excludeAppointmentId: draft?.appointment?.id,
    excludeAppointmentIds,
    excludeCoStaffSessionId: coStaffSessionId,
    isGroupService: false,
  });
  /** Возрастная полоса (1–3 … 16–18) по первому участнику / сессии. */
  const effectiveGroupAgeRange = useMemo((): GroupAgeRange | null => {
    if (!service?.isGroup || !draft?.date) return null;

    if (isJoinGroup || isGroupEdit) {
      const sessionRange =
        groupMembers[0]?.groupAgeRange ||
        draft.groupMembers?.[0]?.groupAgeRange ||
        appointments.find((item) => item.groupSessionId === draft.joinGroupSessionId)?.groupAgeRange ||
        null;
      if (sessionRange) return sessionRange;

      const anchorClientId =
        groupMembers[0]?.client.id ||
        draft.groupMembers?.[0]?.client.id ||
        appointments.find((item) => item.groupSessionId === draft.joinGroupSessionId)?.client.id;
      const anchor = clients.find((client) => client.id === anchorClientId);
      return groupAgeRangeFromBirthDate(anchor?.birthDate, draft.date);
    }

    const firstClientId = clientIds.map((id) => id.trim()).find(Boolean);
    if (!firstClientId) return null;
    const firstClient = clients.find((client) => client.id === firstClientId);
    return groupAgeRangeFromBirthDate(firstClient?.birthDate, draft.date);
  }, [
    appointments,
    clientIds,
    clients,
    draft?.date,
    draft?.groupMembers,
    draft?.joinGroupSessionId,
    groupMembers,
    isGroupEdit,
    isJoinGroup,
    service?.isGroup,
  ]);

  const { options: clientOptions } = useClientConflictOptions({
    clients,
    interval,
    appointments,
    excludeAppointmentId: draft?.appointment?.id,
    excludeAppointmentIds,
    groupAgeRange: effectiveGroupAgeRange,
    date: draft?.date,
  });
  const slotList = useMemo(() => buildSlots(), []);
  const { options: employeeOptions } = useEmployeeConflictOptions({
    date: draft?.date ?? "",
    employees,
    startMin: effectiveStartMin,
    service: service ?? null,
    appointments,
    diagnosticPeriods,
    absences,
    rooms,
    clientId: activeClientIds[0],
    roomId: roomId || undefined,
    joinGroupSessionId: draft?.joinGroupSessionId,
    excludeCoStaffSessionId: coStaffSessionId,
    excludeAppointmentId: draft?.appointment?.id,
    excludeAppointmentIds,
  });

  const staffOptionsForRow = (index: number) => {
    const takenElsewhere = new Set(
      staffEmployeeIds.filter((id, rowIndex) => rowIndex !== index && id.trim()),
    );
    return employeeOptions.map((option) => {
      const taken = option.value !== "" && takenElsewhere.has(option.value);
      return {
        ...option,
        disabled: option.disabled || taken,
        hint: taken ? "уже выбран" : option.hint,
      };
    });
  };

  const { options: timeOptions } = useTimeConflictOptions({
    date: draft?.date ?? "",
    employee,
    employees: staffEmployees,
    service: service ?? null,
    slots: slotList,
    appointments,
    diagnosticPeriods,
    absences,
    rooms,
    clientId: activeClientIds[0],
    roomId: roomId || undefined,
    joinGroupSessionId: draft?.joinGroupSessionId,
    excludeCoStaffSessionId: coStaffSessionId,
    excludeAppointmentId: draft?.appointment?.id,
    excludeAppointmentIds,
  });

  const duplicateClients = activeClientIds.length !== new Set(activeClientIds).size;
  const duplicateStaff = effectiveStaffIds.length !== new Set(effectiveStaffIds).size;
  const canAddStaffRow =
    staffEmployeeIds.length > 0 &&
    staffEmployeeIds.every((id) => !!id.trim()) &&
    !duplicateStaff;
  const canAddClientRow =
    clientIds.length > 0 && clientIds.every((id) => !!id.trim()) && !duplicateClients;
  const canAddGroupClientRow = newGroupClientIds.every((id) => !!id.trim());
  const clientConflict = useMemo(() => {
    if (!draft || !service) return null;
    for (const id of activeClientIds) {
      const conflict = getClientConflict({
        clientId: id,
        interval,
        appointments,
        excludeAppointmentIds,
      });
      if (conflict) return conflict;
    }
    return null;
  }, [activeClientIds, appointments, draft, excludeAppointmentIds, interval, service]);

  const slotConflict = useMemo(() => {
    if (!draft || !staffEmployees.length || !service || isDiagnosticBooking) return null;
    for (const staff of staffEmployees) {
      const conflict = getAppointmentConflict({
        employee: staff,
        date: draft.date,
        interval,
        appointments,
        diagnosticPeriods,
        absences,
        roomId: roomId || undefined,
        rooms,
        clientId: activeClientIds[0],
        service,
        joinGroupSessionId:
          draft.joinGroupSessionId ??
          draft.groupMembers?.[0]?.groupSessionId ??
          (draft.appointment?.service.isGroup ? draft.appointment.groupSessionId ?? undefined : undefined),
        excludeCoStaffSessionId: coStaffSessionId,
        excludeAppointmentId: draft.appointment?.id,
        excludeAppointmentIds,
        ignoreDiagnosticDay: isDiagnosticBooking,
      });
      if (conflict) return conflict;
    }
    return null;
  }, [
    activeClientIds,
    appointments,
    absences,
    coStaffSessionId,
    diagnosticPeriods,
    draft,
    interval,
    isDiagnosticBooking,
    roomId,
    rooms,
    service,
    staffEmployees,
    excludeAppointmentIds,
  ]);

  const ageMismatchError = useMemo(() => {
    if (!draft?.date || !effectiveGroupAgeRange || !service?.isGroup) return "";
    for (const id of activeClientIds) {
      const client = clients.find((item) => item.id === id);
      if (!clientFitsGroupAgeRange(client?.birthDate, effectiveGroupAgeRange, draft.date)) {
        return "Есть клиенты, которые не подходят по возрасту";
      }
    }
    return "";
  }, [activeClientIds, clients, draft?.date, effectiveGroupAgeRange, service?.isGroup]);

  const conflictError =
    slotConflict?.title ||
    clientConflict?.title ||
    ageMismatchError ||
    (duplicateClients ? "Один клиент выбран несколько раз" : "") ||
    (duplicateStaff ? "Один специалист выбран несколько раз" : "") ||
    apiError;

  const removeClientRow = (index: number) => {
    setClientIds((rows) => (rows.length <= 1 ? [""] : rows.filter((_, rowIndex) => rowIndex !== index)));
    setApiError("");
  };

  const removeNewGroupClientRow = (index: number) => {
    setNewGroupClientIds((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
    setApiError("");
  };

  const slotLocked =
    isDiagnosticBooking || (isEdit && !allowEditSlot) || isJoinGroup || (isGroupEdit && !allowEditSlot);

  return {
    clientIds,
    setClientIds,
    serviceId,
    setServiceId,
    roomId,
    setRoomId,
    note,
    setNote,
    effectiveGroupAgeRange,
    clientNoShow,
    setClientNoShow,
    groupMemberNoShow,
    setGroupMemberNoShow,
    apiError,
    setApiError,
    pickedEmployeeId,
    setPickedEmployeeId,
    staffEmployeeIds,
    setStaffEmployeeIds,
    pickedStartMin,
    setPickedStartMin,
    groupMembers,
    setGroupMembers,
    newGroupClientIds,
    setNewGroupClientIds,
    createMode,
    setCreateMode,
    absenceType,
    setAbsenceType,
    absenceStartDate,
    setAbsenceStartDate,
    absenceEndDate,
    setAbsenceEndDate,
    absenceAllDay,
    setAbsenceAllDay,
    absenceStartTime,
    setAbsenceStartTime,
    absenceEndTime,
    setAbsenceEndTime,
    absenceNote,
    setAbsenceNote,
    isEdit,
    isAbsenceEdit,
    isGroupEdit,
    isDiagnosticBooking,
    attendanceOnly,
    isJoinGroup,
    absenceOnly,
    showAbsenceMode,
    isAbsenceMode,
    lockAbsenceEmployee,
    canChangeSlot,
    effectiveStaffIds,
    effectiveEmployeeId,
    effectiveStartMin,
    lockedClientId,
    lockedClient,
    activeClientIds,
    today,
    absenceDay,
    absenceDayEnd,
    absenceDateError,
    absenceConflict,
    service,
    supportsMultiClient,
    employee,
    staffEmployees,
    endMin,
    staffLabel,
    roomOptions,
    clientOptions,
    staffOptionsForRow,
    timeOptions,
    canAddStaffRow,
    canAddClientRow,
    canAddGroupClientRow,
    duplicateClients,
    clientConflict,
    slotConflict,
    conflictError,
    removeClientRow,
    removeNewGroupClientRow,
    slotLocked,
  };
}

export type AppointmentPopoverState = ReturnType<typeof useAppointmentPopoverState>;
