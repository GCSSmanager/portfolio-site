import { eachDayOfInterval, format, parseISO } from "date-fns";

export const CLIENT_SCHEDULE_DEFAULT_DAYS = 14;
export const CLIENT_SCHEDULE_MAX_DAYS = 62;

export function defaultClientScheduleRange(from = new Date()) {
  const startDate = format(from, "yyyy-MM-dd");
  const endDate = format(
    new Date(from.getTime() + (CLIENT_SCHEDULE_DEFAULT_DAYS - 1) * 86_400_000),
    "yyyy-MM-dd",
  );
  return { startDate, endDate };
}

export function datesInRange(startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) return [];
  return eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }).map((day) => format(day, "yyyy-MM-dd"));
}

export function rangeDayCount(startDate: string, endDate: string) {
  return datesInRange(startDate, endDate).length;
}

export function clampClientScheduleEndDate(startDate: string, endDate: string, maxDays = CLIENT_SCHEDULE_MAX_DAYS) {
  const days = datesInRange(startDate, endDate);
  if (days.length <= maxDays) return endDate;
  return days[maxDays - 1] ?? endDate;
}
