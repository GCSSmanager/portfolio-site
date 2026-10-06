import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { Absence, Appointment, Client, DiagnosticPeriod, Employee, Room, Service } from "../../lib/types";
import { Modal, ModalFooter } from "../ui";
import type { SlotDraft } from "../../types/slot-draft";
import type { ClientScheduleUndoEntry } from "../../lib/client-schedule-undo";
import { getAppointmentPopoverTitle } from "./popoverHelpers";
import { useAppointmentPopoverState } from "./useAppointmentPopoverState";
import { useAppointmentPopoverMutations } from "./useAppointmentPopoverMutations";
import { AbsenceFormSection } from "./AbsenceFormSection";
import { GroupMembersSection } from "./GroupMembersSection";
import { AttendanceSection } from "./AttendanceSection";
import { AppointmentFormFields } from "./AppointmentFormFields";

interface Props {
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
  onRecordUndo?: (entry: ClientScheduleUndoEntry) => void;
  onClose: () => void;
  onSaved: () => void;
  onOpenClientCard?: (clientId: string) => void;
}

export function AppointmentPopover({
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
  onRecordUndo,
  onClose,
  onSaved,
  onOpenClientCard,
}: Props) {
  const state = useAppointmentPopoverState({
    draft,
    clients,
    services,
    rooms,
    employees,
    appointments,
    diagnosticPeriods,
    absences,
    fixedClientId,
    fixedRoomId,
    allowEditSlot,
    allowAbsenceCreate,
  });

  const {
    save,
    saveAbsence,
    remove,
    removeGroupMember,
    confirmRemove,
    confirmRemoveGroupMember,
  } = useAppointmentPopoverMutations({
    draft,
    appointments,
    allowEditSlot,
    onRecordUndo,
    onClose,
    onSaved,
    clientNoShow: state.clientNoShow,
    groupMemberNoShow: state.groupMemberNoShow,
    groupMembers: state.groupMembers,
    setGroupMembers: state.setGroupMembers,
    setClientIds: state.setClientIds,
    newGroupClientIds: state.newGroupClientIds,
    setApiError: state.setApiError,
    note: state.note,
    serviceId: state.serviceId,
    roomId: state.roomId,
    activeClientIds: state.activeClientIds,
    effectiveStaffIds: state.effectiveStaffIds,
    effectiveEmployeeId: state.effectiveEmployeeId,
    effectiveStartMin: state.effectiveStartMin,
    attendanceOnly: state.attendanceOnly,
    isEdit: state.isEdit,
    isGroupEdit: state.isGroupEdit,
    isAbsenceEdit: state.isAbsenceEdit,
    isAbsenceMode: state.isAbsenceMode,
    absenceType: state.absenceType,
    absenceDay: state.absenceDay,
    absenceDayEnd: state.absenceDayEnd,
    absenceAllDay: state.absenceAllDay,
    absenceStartTime: state.absenceStartTime,
    absenceEndTime: state.absenceEndTime,
    absenceNote: state.absenceNote,
    absenceDateError: state.absenceDateError,
    absenceConflict: state.absenceConflict,
    conflictError: state.conflictError,
    clientConflict: state.clientConflict,
    duplicateClients: state.duplicateClients,
    apiError: state.apiError,
  });

  if (!draft) return null;

  const draftDayLabel = format(parseISO(draft.date), "d MMMM yyyy, EEEE", { locale: ru });

  return (
    <Modal
      open
      title={getAppointmentPopoverTitle({
        isAbsenceMode: state.isAbsenceMode,
        isAbsenceEdit: state.isAbsenceEdit,
        isDiagnosticBooking: state.isDiagnosticBooking,
        attendanceOnly: state.attendanceOnly,
        isGroupEdit: state.isGroupEdit,
        isEdit: state.isEdit,
      })}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface/60 px-3 py-2.5 text-sm text-ink-muted">
          {draftDayLabel}
        </div>

        {state.showAbsenceMode && (
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface/50 p-1">
            <button
              type="button"
              className={[
                "h-9 rounded-xl text-sm font-medium transition-colors",
                state.createMode === "appointment" ? "bg-panel text-brand-dark shadow-sm" : "text-ink-muted hover:text-ink",
              ].join(" ")}
              onClick={() => {
                state.setCreateMode("appointment");
                state.setApiError("");
              }}
            >
              Запись
            </button>
            <button
              type="button"
              className={[
                "h-9 rounded-xl text-sm font-medium transition-colors",
                state.createMode === "absence" ? "bg-panel text-brand-dark shadow-sm" : "text-ink-muted hover:text-ink",
              ].join(" ")}
              onClick={() => {
                state.setCreateMode("absence");
                state.setApiError("");
              }}
            >
              Отсутствие
            </button>
          </div>
        )}

        {state.isAbsenceMode ? (
          <AbsenceFormSection
            draft={draft}
            employee={state.employee}
            absenceConflict={state.absenceConflict}
            apiError={state.apiError}
            lockAbsenceEmployee={state.lockAbsenceEmployee}
            pickedEmployeeId={state.pickedEmployeeId}
            setPickedEmployeeId={state.setPickedEmployeeId}
            setApiError={state.setApiError}
            employees={employees}
            absenceType={state.absenceType}
            setAbsenceType={state.setAbsenceType}
            today={state.today}
            absenceDateError={state.absenceDateError}
            absenceDay={state.absenceDay}
            absenceOnly={state.absenceOnly}
            isAbsenceEdit={state.isAbsenceEdit}
            absenceStartDate={state.absenceStartDate}
            absenceEndDate={state.absenceEndDate}
            absenceAllDay={state.absenceAllDay}
            absenceStartTime={state.absenceStartTime}
            absenceEndTime={state.absenceEndTime}
            absenceNote={state.absenceNote}
            showAbsenceMode={state.showAbsenceMode}
            setAbsenceStartDate={state.setAbsenceStartDate}
            setAbsenceEndDate={state.setAbsenceEndDate}
            setAbsenceAllDay={state.setAbsenceAllDay}
            setAbsenceStartTime={state.setAbsenceStartTime}
            setAbsenceEndTime={state.setAbsenceEndTime}
            setAbsenceNote={state.setAbsenceNote}
            onClose={onClose}
            onSubmit={() => saveAbsence.mutate()}
            submitDisabled={
              saveAbsence.isPending ||
              !state.effectiveEmployeeId ||
              !(state.absenceOnly && !state.isAbsenceEdit ? draft.date : state.absenceStartDate) ||
              !!state.absenceDateError ||
              !!state.absenceConflict
            }
            onDelete={state.isAbsenceEdit ? confirmRemove : undefined}
          />
        ) : (
          <>
            <AppointmentFormFields
              draft={draft}
              canChangeSlot={state.canChangeSlot}
              attendanceOnly={state.attendanceOnly}
              staffEmployeeIds={state.staffEmployeeIds}
              setStaffEmployeeIds={state.setStaffEmployeeIds}
              setPickedEmployeeId={state.setPickedEmployeeId}
              setApiError={state.setApiError}
              staffOptionsForRow={state.staffOptionsForRow}
              canAddStaffRow={state.canAddStaffRow}
              pickedStartMin={state.pickedStartMin}
              setPickedStartMin={state.setPickedStartMin}
              timeOptions={state.timeOptions}
              slotConflict={state.slotConflict}
              apiError={state.apiError}
              staffLabel={state.staffLabel}
              staffEmployees={state.staffEmployees}
              service={state.service}
              conflictError={state.conflictError}
              effectiveStartMin={state.effectiveStartMin}
              endMin={state.endMin}
              slotLocked={state.slotLocked}
              isGroupEdit={state.isGroupEdit}
              supportsMultiClient={state.supportsMultiClient}
              clientIds={state.clientIds}
              groupMembersSection={
                state.isGroupEdit ? (
                  <GroupMembersSection
                    groupMembers={state.groupMembers}
                    attendanceOnly={state.attendanceOnly}
                    isGroupEdit={state.isGroupEdit}
                    removeGroupMemberPending={removeGroupMember.isPending}
                    onRemoveMember={confirmRemoveGroupMember}
                    groupMemberNoShow={state.groupMemberNoShow}
                    setGroupMemberNoShow={state.setGroupMemberNoShow}
                    setApiError={state.setApiError}
                    newGroupClientIds={state.newGroupClientIds}
                    setNewGroupClientIds={state.setNewGroupClientIds}
                    clientOptions={state.clientOptions}
                    removeNewGroupClientRow={state.removeNewGroupClientRow}
                    canAddGroupClientRow={state.canAddGroupClientRow}
                    onOpenClientCard={onOpenClientCard}
                  />
                ) : undefined
              }
              isEdit={state.isEdit}
              fixedClientId={fixedClientId}
              clients={clients}
              activeClientIds={state.activeClientIds}
              setClientIds={state.setClientIds}
              clientOptions={state.clientOptions}
              lockedClientId={state.lockedClientId}
              lockedClient={state.lockedClient}
              removeClientRow={state.removeClientRow}
              canAddClientRow={state.canAddClientRow}
              isDiagnosticBooking={state.isDiagnosticBooking}
              serviceId={state.serviceId}
              setServiceId={state.setServiceId}
              services={services}
              isJoinGroup={state.isJoinGroup}
              rooms={rooms}
              roomId={state.roomId}
              setRoomId={state.setRoomId}
              roomOptions={state.roomOptions}
              note={state.note}
              setNote={state.setNote}
              onOpenClientCard={onOpenClientCard}
            />

            {state.isEdit && !state.isGroupEdit && (
              <AttendanceSection
                clientNoShow={state.clientNoShow}
                onClientNoShowChange={state.setClientNoShow}
                setApiError={state.setApiError}
              />
            )}

            <ModalFooter
              onCancel={onClose}
              onSubmit={() => save.mutate()}
              submitText={state.attendanceOnly || state.isEdit || state.isGroupEdit ? "Сохранить" : "Записать"}
              submitDisabled={
                state.attendanceOnly
                  ? save.isPending || (!state.isEdit && !state.isGroupEdit)
                  : state.isDiagnosticBooking
                    ? save.isPending || state.activeClientIds.length === 0 || !!state.clientConflict || !!state.apiError
                    : save.isPending ||
                      state.activeClientIds.length === 0 ||
                      !state.serviceId ||
                      state.effectiveStaffIds.length === 0 ||
                      !!state.conflictError
              }
              onDelete={
                !state.attendanceOnly && !state.isDiagnosticBooking && (state.isEdit || state.isGroupEdit)
                  ? confirmRemove
                  : undefined
              }
              deleteText={state.isGroupEdit ? "Удалить занятие" : "Удалить"}
              deleteDisabled={remove.isPending || removeGroupMember.isPending}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
