import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ClientScheduleResponse } from "../lib/types";

export function useClientSchedule(clientId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["client-schedule", clientId, startDate, endDate],
    queryFn: async () =>
      (
        await api.get<ClientScheduleResponse>(`/api/clients/${clientId}/schedule`, {
          params: { startDate, endDate },
        })
      ).data,
    enabled: !!clientId && !!startDate && !!endDate && endDate >= startDate,
  });
}
