import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { resources } from "../lib/resources";
import type { Appointment, DiagnosticPeriod } from "../lib/types";

export function useScheduleDaysAppointments(dates: string[]) {
  const queries = useQueries({
    queries: dates.map((date) => ({
      queryKey: ["appointments", date],
      queryFn: async () => (await api.get<Appointment[]>(`/api/appointments?date=${date}`)).data,
      enabled: !!date,
    })),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    dates.forEach((date, index) => {
      const items = (queries[index]?.data ?? []).filter((item) => item.status !== "CANCELLED");
      map.set(date, items);
    });
    return map;
  }, [dates, queries]);

  return {
    byDate,
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  };
}

export function useScheduleDayDiagnosticPeriods(date: string) {
  return useQuery({
    queryKey: ["diagnostic-periods", date],
    queryFn: () => resources.diagnosticPeriods.list({ date }) as Promise<DiagnosticPeriod[]>,
    enabled: !!date,
  });
}

export function useScheduleDaysDiagnosticPeriods(dates: string[]) {
  const queries = useQueries({
    queries: dates.map((date) => ({
      queryKey: ["diagnostic-periods", date],
      queryFn: () => resources.diagnosticPeriods.list({ date }) as Promise<DiagnosticPeriod[]>,
      enabled: !!date,
    })),
  });

  const byDate = useMemo(() => {
    const map = new Map<string, DiagnosticPeriod[]>();
    dates.forEach((date, index) => {
      map.set(date, queries[index]?.data ?? []);
    });
    return map;
  }, [dates, queries]);

  return {
    byDate,
    isLoading: queries.some((query) => query.isLoading),
  };
}
