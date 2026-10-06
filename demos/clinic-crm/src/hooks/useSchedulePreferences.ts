import { useCallback, useEffect, useState } from "react";
import {
  loadSchedulePreferences,
  saveSchedulePreferences,
  SCHEDULE_PREFERENCES_EVENT,
  type ScheduleDisplayPreferences,
} from "../lib/schedule-preferences";

export function useSchedulePreferences() {
  const [preferences, setPreferences] = useState(loadSchedulePreferences);

  useEffect(() => {
    const refresh = () => setPreferences(loadSchedulePreferences());
    window.addEventListener(SCHEDULE_PREFERENCES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SCHEDULE_PREFERENCES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const save = useCallback((next: ScheduleDisplayPreferences) => {
    setPreferences(saveSchedulePreferences(next));
  }, []);

  return { preferences, save };
}
