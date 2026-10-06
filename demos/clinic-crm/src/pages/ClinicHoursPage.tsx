import { ClinicHoursPanel } from "../components/ClinicHoursCard";
import { ScheduleDisplaySettings } from "../components/ScheduleDisplaySettings";
import { PageHeader } from "../components/ui";
import { useSchedulePreferences } from "../hooks/useSchedulePreferences";

export function ClinicHoursPage() {
  const { preferences, save } = useSchedulePreferences();

  return (
    <div className="max-w-4xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Время работы клиники" />
      <ClinicHoursPanel />
      <ScheduleDisplaySettings preferences={preferences} onSave={save} />
    </div>
  );
}
