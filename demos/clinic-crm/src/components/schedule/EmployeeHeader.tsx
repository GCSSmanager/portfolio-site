import type { Employee } from "../../lib/types";
import { scheduleStyles } from "./scheduleStyles";

interface Props {
  employee: Employee;
}

export function EmployeeHeader({ employee }: Props) {
  return (
    <div className={scheduleStyles.employeeHeader}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white" style={{ background: employee.color }} />
        <span className="text-xs font-semibold text-ink truncate">{employee.shortName}</span>
      </div>
      {employee.position && (
        <span className="text-[9px] text-ink-muted truncate pl-3.5">{employee.position}</span>
      )}
    </div>
  );
}
