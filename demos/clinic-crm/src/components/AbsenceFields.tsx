import { Checkbox, DatePicker, Field, Input, TimePicker } from "./ui";

interface Props {
  today: string;
  dateError: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  note: string;
  /** Одна дата (клик по календарю) — без диапазона С/По. */
  singleDay?: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onAllDayChange: (value: boolean) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onNoteChange: (value: string) => void;
}

export function AbsenceFields({
  today,
  dateError,
  startDate,
  endDate,
  allDay,
  startTime,
  endTime,
  note,
  singleDay = false,
  onStartDateChange,
  onEndDateChange,
  onAllDayChange,
  onStartTimeChange,
  onEndTimeChange,
  onNoteChange,
}: Props) {
  return (
    <>
      {singleDay ? (
        <Field label="Дата">
          <div className="flex h-9 items-center rounded-xl border border-line bg-surface px-3 text-sm text-ink">
            {startDate}
          </div>
        </Field>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="С">
            <DatePicker min={today} value={startDate} onChange={onStartDateChange} invalid={!!dateError} />
          </Field>
          <Field label="По">
            <DatePicker min={today} value={endDate} onChange={onEndDateChange} invalid={!!dateError} />
          </Field>
        </div>
      )}
      {dateError && <p className="text-xs font-medium text-red-600">{dateError}</p>}
      <Checkbox checked={allDay} onChange={onAllDayChange} label="Весь рабочий день" />
      {!allDay && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="С">
            <TimePicker value={startTime} onChange={onStartTimeChange} />
          </Field>
          <Field label="До">
            <TimePicker value={endTime} onChange={onEndTimeChange} />
          </Field>
        </div>
      )}
      <Field label="Заметка">
        <Input value={note} onChange={(event) => onNoteChange(event.target.value)} />
      </Field>
    </>
  );
}
