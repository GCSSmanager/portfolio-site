import { Field } from "../ui";
import { AttendanceChoice, attendanceFromNoShow, noShowFromAttendance } from "../AttendanceChoice";

interface Props {
  clientNoShow: boolean | null;
  onClientNoShowChange: (value: boolean | null) => void;
  setApiError: (value: string) => void;
}

export function AttendanceSection({ clientNoShow, onClientNoShowChange, setApiError }: Props) {
  return (
    <Field label="Явка">
      <AttendanceChoice
        value={attendanceFromNoShow(clientNoShow)}
        onChange={(value) => {
          onClientNoShowChange(noShowFromAttendance(value));
          setApiError("");
        }}
      />
    </Field>
  );
}
