import { useCallback, type Dispatch, type SetStateAction } from "react";
import { useMutation } from "@tanstack/react-query";
import { timeToMin } from "../../lib/format";
import type { AbsenceType, Appointment } from "../../lib/types";
import { api } from "../../lib/api";
import { resources } from "../../lib/resources";
import { mutationErrorMessage, useConfirm, useToast } from "../feedback";
import type { SlotDraft } from "../../types/slot-draft";
import { useSubmitShortcut } from "../../hooks/useSubmitShortcut";
import type { ClientScheduleUndoEntry } from "../../lib/client-schedule-undo";
import { appointmentRestorePayload } from "../../lib/client-schedule-undo";
import type { ScheduleConflict } from "../../lib/conflicts";

export interface AppointmentPopoverMutationsParams {
  draft: SlotDraft | null;
  appointments: Appointment[];
  allowEditSlot: boolean;
  onRecordUndo?: (entry: ClientScheduleUndoEntry) => void;
  onClose: () => void;
  onSaved: () => void;
  clientNoShow: boolean | null;
  groupMemberNoShow: Record<string, boolean | null>;
  groupMembers: Appointment[];
  setGroupMembers: Dispatch<SetStateAction<Appointment[]>>;
  setClientIds: Dispatch<SetStateAction<string[]>>;
  newGroupClientIds: string[];
  setApiError: Dispatch<SetStateAction<string>>;
  note: string;
  serviceId: string;
  roomId: string;
  activeClientIds: string[];
  effectiveStaffIds: string[];
  effectiveEmployeeId: string;
  effectiveStartMin: number;
  attendanceOnly: boolean;
  isEdit: boolean;
  isGroupEdit: boolean;
  isAbsenceEdit: boolean;
  isAbsenceMode: boolean;
  absenceType: AbsenceType;
  absenceDay: string;
  absenceDayEnd: string;
  absenceAllDay: boolean;
  absenceStartTime: string;
  absenceEndTime: string;
  absenceNote: string;
  absenceDateError: string;
  absenceConflict: ScheduleConflict | null;
  conflictError: string;
  clientConflict: ScheduleConflict | null;
  duplicateClients: boolean;
  apiError: string;
}

export function useAppointmentPopoverMutations({
  draft,
  appointments,
  allowEditSlot,
  onRecordUndo,
  onClose,
  onSaved,
  clientNoShow,
  groupMemberNoShow,
  groupMembers,
  setGroupMembers,
  setClientIds,
  newGroupClientIds,
  setApiError,
  note,
  serviceId,
  roomId,
  activeClientIds,
  effectiveStaffIds,
  effectiveEmployeeId,
  effectiveStartMin,
  attendanceOnly,
  isEdit,
  isGroupEdit,
  isAbsenceEdit,
  isAbsenceMode,
  absenceType,
  absenceDay,
  absenceDayEnd,
  absenceAllDay,
  absenceStartTime,
  absenceEndTime,
  absenceNote,
  absenceDateError,
  absenceConflict,
  conflictError,
  clientConflict,
  duplicateClients,
  apiError,
}: AppointmentPopoverMutationsParams) {
  const toast = useToast();
  const confirm = useConfirm();

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;

      if (attendanceOnly) {
        if (isGroupEdit) {
          for (const member of groupMembers) {
            await api.patch(`/api/appointments/${member.id}`, {
              clientNoShow: groupMemberNoShow[member.id] ?? member.clientNoShow ?? null,
            });
          }
          return;
        }
        if (draft.appointment) {
          await api.patch(`/api/appointments/${draft.appointment.id}`, { clientNoShow });
          return;
        }
        if (draft.joinGroupSessionId) {
          for (const member of groupMembers) {
            await api.patch(`/api/appointments/${member.id}`, {
              clientNoShow: groupMemberNoShow[member.id] ?? member.clientNoShow ?? null,
            });
          }
        }
        return;
      }

      if (draft.appointment?.diagnosticPeriodId) {
        if (clientConflict?.title || duplicateClients || apiError) {
          throw new Error(clientConflict?.title || apiError || "Исправьте ошибки перед сохранением");
        }
        await api.patch(`/api/appointments/${draft.appointment.id}`, {
          clientId: activeClientIds[0],
          note: note || null,
          clientNoShow,
        });
        return;
      }

      // Раньше был голый `return` → react-query считал успех и писал «Запись создана».
      if (conflictError) throw new Error(conflictError);
      if (!effectiveStaffIds.length) throw new Error("Выберите специалиста");
      const payload = {
        serviceId,
        roomId: roomId || null,
        note: note || null,
      };

      const groupSessionId =
        draft.joinGroupSessionId ??
        (draft.appointment?.service.isGroup ? draft.appointment.groupSessionId : null) ??
        groupMembers[0]?.groupSessionId ??
        undefined;

      if (isGroupEdit && groupSessionId) {
        const primary = groupMembers[0] ?? draft.appointment;
        if (!primary) return;

        const prevStaff = [...new Set((draft.groupMembers ?? groupMembers).map((m) => m.employee.id))];
        const staffChanged =
          prevStaff.length !== effectiveStaffIds.length ||
          effectiveStaffIds.some((id) => !prevStaff.includes(id));

        if (allowEditSlot && (staffChanged || effectiveStartMin !== primary.startMin)) {
          const previousStartMin = primary.startMin;
          await api.patch(`/api/appointments/${primary.id}`, {
            ...(staffChanged || effectiveStaffIds.length > 1
              ? { employeeIds: effectiveStaffIds }
              : { employeeId: effectiveEmployeeId }),
            startMin: effectiveStartMin,
          });
          if (onRecordUndo && previousStartMin !== effectiveStartMin) {
            onRecordUndo({
              kind: "move",
              appointmentId: primary.id,
              date: draft.date,
              startMin: previousStartMin,
            });
          }
        }

        for (const member of groupMembers) {
          await api.patch(`/api/appointments/${member.id}`, {
            roomId: roomId || null,
            note: note || null,
            clientNoShow: groupMemberNoShow[member.id] ?? member.clientNoShow ?? null,
          });
        }

        for (const nextClientId of newGroupClientIds.map((id) => id.trim()).filter(Boolean)) {
          const response = await api.post<Appointment>("/api/appointments", {
            date: draft.date,
            startMin: effectiveStartMin,
            employeeIds: effectiveStaffIds,
            clientId: nextClientId,
            ...payload,
            roomId: roomId || undefined,
            note: note || undefined,
            groupSessionId,
          });
          onRecordUndo?.({ kind: "create", appointmentId: response.data.id });
        }
        return;
      }

      if (draft.appointment) {
        const previousDate = draft.appointment.date.slice(0, 10);
        const previousStartMin = draft.appointment.startMin;
        const prevStaff = draft.appointment.coStaffSessionId
          ? [
              ...new Set(
                appointments
                  .filter((item) => item.coStaffSessionId === draft.appointment!.coStaffSessionId)
                  .map((item) => item.employee.id),
              ),
            ]
          : [draft.appointment.employee.id];
        const staffChanged =
          prevStaff.length !== effectiveStaffIds.length ||
          effectiveStaffIds.some((id) => !prevStaff.includes(id));

        await api.patch(`/api/appointments/${draft.appointment.id}`, {
          clientId: activeClientIds[0],
          ...(allowEditSlot
            ? staffChanged || effectiveStaffIds.length > 1
              ? { employeeIds: effectiveStaffIds, startMin: effectiveStartMin }
              : { employeeId: effectiveEmployeeId, startMin: effectiveStartMin }
            : {}),
          ...payload,
          clientNoShow,
        });
        if (
          onRecordUndo &&
          allowEditSlot &&
          (previousDate !== draft.date || previousStartMin !== effectiveStartMin)
        ) {
          onRecordUndo({
            kind: "move",
            appointmentId: draft.appointment.id,
            date: previousDate,
            startMin: previousStartMin,
          });
        }
        return;
      }

      const response = await api.post<Appointment>("/api/appointments", {
        date: draft.date,
        startMin: effectiveStartMin,
        employeeIds: effectiveStaffIds,
        clientIds: activeClientIds,
        ...payload,
        roomId: roomId || undefined,
        note: note || undefined,
        groupSessionId: draft.joinGroupSessionId,
      });
      onRecordUndo?.({ kind: "create", appointmentId: response.data.id });
    },
    onSuccess: () => {
      toast({
        tone: "success",
        title: attendanceOnly ? "Явка сохранена" : isEdit || isGroupEdit ? "Запись обновлена" : "Запись создана",
      });
      onSaved();
      onClose();
    },
    onError: (e: unknown) => {
      const msg = mutationErrorMessage(e, "Не удалось сохранить запись");
      setApiError(msg);
      toast({ tone: "error", title: "Ошибка сохранения", message: msg });
    },
  });

  const saveAbsence = useMutation({
    mutationFn: async () => {
      if (!draft || !effectiveEmployeeId || absenceDateError || absenceConflict) return;
      const payload = {
        employeeId: effectiveEmployeeId,
        type: absenceType,
        startDate: absenceDay,
        endDate: absenceDayEnd,
        startMin: absenceAllDay ? null : timeToMin(absenceStartTime),
        endMin: absenceAllDay ? null : timeToMin(absenceEndTime),
        note: absenceNote || null,
      };
      if (draft.absence?.id) {
        return (await resources.absences.update(draft.absence.id, payload)) as { id: string };
      }
      return (await resources.absences.create(payload)) as { id: string };
    },
    onSuccess: (saved) => {
      if (!isAbsenceEdit && saved?.id) onRecordUndo?.({ kind: "absence-create", absenceId: saved.id });
      toast({ tone: "success", title: isAbsenceEdit ? "Отсутствие обновлено" : "Отсутствие отмечено" });
      onSaved();
      onClose();
    },
    onError: (e: unknown) => {
      const msg = mutationErrorMessage(e, "Не удалось сохранить отсутствие");
      setApiError(msg);
      toast({ tone: "error", title: "Ошибка сохранения", message: msg });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (draft?.absence?.id) {
        await resources.absences.remove(draft.absence.id);
        return "absence" as const;
      }
      const membersToDelete = groupMembers.length ? groupMembers : draft?.groupMembers ?? [];
      const groupSessionId =
        draft?.joinGroupSessionId ??
        (draft?.appointment?.service.isGroup ? draft.appointment.groupSessionId : null) ??
        membersToDelete[0]?.groupSessionId;
      if (membersToDelete.length && groupSessionId) {
        for (const member of membersToDelete) {
          onRecordUndo?.({ kind: "restore", payload: appointmentRestorePayload(member) });
          await api.delete(`/api/appointments/${member.id}`);
        }
        return "group" as const;
      }
      if (draft?.appointment && !groupSessionId) {
        onRecordUndo?.({ kind: "restore", payload: appointmentRestorePayload(draft.appointment) });
        await api.delete(`/api/appointments/${draft.appointment.id}`);
        return "appointment" as const;
      }
      return "none" as const;
    },
    onSuccess: (kind) => {
      toast({
        tone: "success",
        title:
          kind === "absence"
            ? "Отсутствие удалено"
            : kind === "group"
              ? "Групповое занятие удалено"
              : "Запись удалена",
      });
      onSaved();
      onClose();
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось удалить", message: mutationErrorMessage(e) }),
  });

  const removeGroupMember = useMutation({
    mutationFn: async (member: Appointment) => {
      onRecordUndo?.({ kind: "restore", payload: appointmentRestorePayload(member) });
      await api.delete(`/api/appointments/${member.id}`);
      return member;
    },
    onSuccess: (member) => {
      setGroupMembers((current) => {
        const next = current.filter((item) => item.id !== member.id);
        if (next.length === 0) {
          queueMicrotask(() => {
            onSaved();
            onClose();
          });
        }
        return next;
      });
      setClientIds((current) => current.filter((id) => id !== member.client.id));
      onSaved();
      toast({ tone: "success", title: "Клиент убран из группы", message: member.client.fullName });
    },
    onError: (e) => toast({ tone: "error", title: "Не удалось убрать клиента", message: mutationErrorMessage(e) }),
  });

  const submit = useCallback(() => {
    if (isAbsenceMode) {
      if (
        !saveAbsence.isPending &&
        effectiveEmployeeId &&
        absenceDay &&
        !absenceDateError &&
        !absenceConflict
      ) {
        saveAbsence.mutate();
      }
      return;
    }
    if (attendanceOnly) {
      if (!save.isPending && (isEdit || isGroupEdit)) save.mutate();
      return;
    }
    if (
      !save.isPending &&
      activeClientIds.length > 0 &&
      serviceId &&
      effectiveStaffIds.length > 0 &&
      !conflictError
    ) {
      save.mutate();
    }
  }, [
    absenceConflict,
    absenceDateError,
    absenceDay,
    activeClientIds.length,
    attendanceOnly,
    conflictError,
    effectiveEmployeeId,
    effectiveStaffIds.length,
    isAbsenceMode,
    isEdit,
    isGroupEdit,
    save,
    saveAbsence,
    serviceId,
  ]);
  useSubmitShortcut({ enabled: !!draft, onSubmit: submit });

  const confirmRemove = async () => {
    const ok = await confirm({
      title: isAbsenceEdit
        ? "Удалить отсутствие?"
        : isGroupEdit
          ? "Удалить групповое занятие?"
          : "Удалить запись?",
      message: isAbsenceEdit
        ? "Отсутствие будет снято из расписания."
        : isGroupEdit
          ? "Занятие будет удалено для всех участников. Это действие нельзя быстро отменить."
          : "Запись исчезнет из расписания. Это действие нельзя быстро отменить.",
      confirmText: "Удалить",
      danger: true,
    });
    if (ok) remove.mutate();
  };

  const confirmRemoveGroupMember = async (member: Appointment) => {
    const ok = await confirm({
      title: "Убрать клиента из группы?",
      message: `${member.client.fullName} будет снят с занятия. Остальные участники останутся.`,
      confirmText: "Убрать",
      danger: true,
    });
    if (ok) removeGroupMember.mutate(member);
  };

  return {
    save,
    saveAbsence,
    remove,
    removeGroupMember,
    submit,
    confirmRemove,
    confirmRemoveGroupMember,
  };
}
