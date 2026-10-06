import { useCallback, useEffect, useState } from "react";
import {
  loadClientSchedulePreferences,
  saveClientSchedulePreferences,
  CLIENT_SCHEDULE_PREFERENCES_EVENT,
  type ClientScheduleDisplayPreferences,
} from "../lib/client-schedule-preferences";

export function useClientSchedulePreferences() {
  const [preferences, setPreferences] = useState(loadClientSchedulePreferences);

  useEffect(() => {
    const refresh = () => setPreferences(loadClientSchedulePreferences());
    window.addEventListener(CLIENT_SCHEDULE_PREFERENCES_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CLIENT_SCHEDULE_PREFERENCES_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const save = useCallback((next: ClientScheduleDisplayPreferences) => {
    setPreferences(saveClientSchedulePreferences(next));
  }, []);

  return { preferences, save };
}
