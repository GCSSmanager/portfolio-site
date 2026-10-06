import { ABSENCE_LABELS } from "../../lib/format";
import type { AbsenceType, Employee } from "../../lib/types";
import type { ScheduleConflict } from "../../lib/conflicts";
import type { SlotDraft } from "../../types/slot-draft";
import { Field, SearchSelect, ModalFooter } from "../ui";
import { AbsenceFields } from "../AbsenceFields";
import { ConflictNotice } from "../ConflictNotice";

interface Props {
  draft: SlotDraft;
  employee: Employee | undefined;
  absenceConflict: ScheduleConflict | null;
  apiError: string;
  lockAbsenceEmployee: boolean;
  pickedEmployeeId: string;
  setPickedEmployeeId: (value: string) => void;
  setApiError: (value: string) => void;
  employees: Employee[];
  absenceType: AbsenceType;
  setAbsenceType: (value: AbsenceType) => void;
  today: string;
  absenceDateError: string;
  absenceDay: string;
  absenceOnly: boolean;
  isAbsenceEdit: boolean;
  absenceStartDate: string;
  absenceEndDate: string;
  absenceAllDay: boolean;
  absenceStartTime: string;
  absenceEndTime: string;
  absenceNote: string;
  showAbsenceMode: boolean;
  setAbsenceStartDate: (value: string) => void;
  setAbsenceEndDate: (value: string) => void;
  setAbsenceAllDay: (value: boolean) => void;
  setAbsenceStartTime: (value: string) => void;
  setAbsenceEndTime: (value: string) => void;
  setAbsenceNote: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  onDelete?: () => void;
}

export function AbsenceFormSection({
  draft,
  employee,
  absenceConflict,
  apiError,
  lockAbsenceEmployee,
  pickedEmployeeId,
  setPickedEmployeeId,
  setApiError,
  employees,
  absenceType,
  setAbsenceType,
  today,
  absenceDateError,
  absenceDay,
  absenceOnly,
  isAbsenceEdit,
  absenceStartDate,
  absenceEndDate,
  absenceAllDay,
  absenceStartTime,
  absenceEndTime,
  absenceNote,
  showAbsenceMode,
  setAbsenceStartDate,
  setAbsenceEndDate,
  setAbsenceAllDay,
  setAbsenceStartTime,
  setAbsenceEndTime,
  setAbsenceNote,
  onClose,
  onSubmit,
  submitDisabled,
  onDelete,
}: Props) {
  return (
    <>
      <div
        className={[
          "rounded-2xl border px-3 py-2.5 text-sm",
          absenceConflict || apiError
            ? "border-red-200 bg-red-50/80"
            : "border-brand-soft bg-brand-light/50",
        ].join(" ")}
      >
        <span className="font-medium text-ink">
          {employee?.shortName ?? draft.employeeName ?? "Специалист не выбран"}
        </span>
        {!absenceAllDay && absenceDay && !absenceDateError && (
          <p
            className={[
              "mt-1 text-[11px] font-semibold tabular-nums",
              absenceConflict ? "text-red-700" : "text-brand-dark",
            ].join(" ")}
          >
            {absenceStartTime}–{absenceEndTime}
          </p>
        )}
        <div className="mt-2">
          <ConflictNotice conflict={absenceConflict} message={apiError} />
        </div>
      </div>
      {!lockAbsenceEmployee && (
        <Field label="Специалист">
          <SearchSelect
            value={pickedEmployeeId || draft.employeeId}
            onChange={(value) => {
              setPickedEmployeeId(value);
              setApiError("");
            }}
            options={employees.map((item) => ({ value: item.id, label: item.shortName }))}
            placeholder="Выберите специалиста…"
            searchPlaceholder="Специалист…"
          />
        </Field>
      )}
      <Field label="Тип">
        <SearchSelect
          value={absenceType}
          onChange={(value) => setAbsenceType(value as AbsenceType)}
          options={Object.entries(ABSENCE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <AbsenceFields
        today={today}
        dateError={absenceDateError}
        startDate={absenceOnly && !isAbsenceEdit ? draft.date : absenceStartDate}
        endDate={absenceOnly && !isAbsenceEdit ? draft.date : absenceEndDate}
        allDay={absenceAllDay}
        startTime={absenceStartTime}
        endTime={absenceEndTime}
        note={absenceNote}
        singleDay={(absenceOnly && !isAbsenceEdit) || showAbsenceMode}
        onStartDateChange={(value) => {
          setAbsenceStartDate(value);
          setAbsenceEndDate(value);
        }}
        onEndDateChange={setAbsenceEndDate}
        onAllDayChange={setAbsenceAllDay}
        onStartTimeChange={setAbsenceStartTime}
        onEndTimeChange={setAbsenceEndTime}
        onNoteChange={setAbsenceNote}
      />
      <ModalFooter
        onCancel={onClose}
        onSubmit={onSubmit}
        submitText={isAbsenceEdit ? "Сохранить" : "Отметить"}
        submitDisabled={submitDisabled}
        onDelete={onDelete}
        deleteText="Удалить"
      />
    </>
  );
}
