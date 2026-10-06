import { ChoiceGroup } from "./ui";

/** unmarked = нет отметки, attended = пришёл, no_show = не пришёл */
export type AttendanceValue = "unmarked" | "attended" | "no_show";

export function attendanceFromNoShow(clientNoShow: boolean | null | undefined): AttendanceValue {
  if (clientNoShow === true) return "no_show";
  if (clientNoShow === false) return "attended";
  return "unmarked";
}

export function noShowFromAttendance(value: AttendanceValue): boolean | null {
  if (value === "no_show") return true;
  if (value === "attended") return false;
  return null;
}

interface Props {
  value: AttendanceValue;
  onChange: (value: AttendanceValue) => void;
  disabled?: boolean;
}

export function AttendanceChoice({ value, onChange, disabled = false }: Props) {
  return (
    <ChoiceGroup
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={[
        { value: "unmarked", label: "Нет отметки" },
        { value: "attended", label: "Пришёл" },
        { value: "no_show", label: "Не пришёл" },
      ]}
    />
  );
}

/** Кружок явки на карточке календаря. */
export function AttendanceDot({
  clientNoShow,
  className = "",
}: {
  clientNoShow: boolean | null | undefined;
  className?: string;
}) {
  const tone =
    clientNoShow === true
      ? "bg-red-500"
      : clientNoShow === false
        ? "bg-emerald-500"
        : "bg-ink-muted/40";
  const label =
    clientNoShow === true ? "Не пришёл" : clientNoShow === false ? "Пришёл" : "Нет отметки";

  return (
    <span
      className={["inline-block h-2 w-2 shrink-0 rounded-full", tone, className].join(" ")}
      title={label}
      aria-label={label}
    />
  );
}
