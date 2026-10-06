import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export function formatClientScheduleDayLabel(date: string) {
  const day = parseISO(date);
  return {
    short: format(day, "d.MM"),
    weekday: format(day, "EEEEEE", { locale: ru }),
    full: format(day, "d MMMM", { locale: ru }),
    isToday: format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
  };
}
