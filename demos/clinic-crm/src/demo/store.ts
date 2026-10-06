import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { createSeedDb, nearestOpenDay, type DemoDb } from "./seed";

const DB_KEY = "clinic-demo.db";

/** Данные живут в localStorage — переживают закрытие вкладки/браузера на этом устройстве. */
export function loadDb(): DemoDb {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      const db = JSON.parse(raw) as DemoDb;
      ensureDiagnosticService(db);
      alignDemoDay(db);
      return db;
    } catch {
      /* reset */
    }
  }
  const fresh = createSeedDb();
  saveDb(fresh);
  return fresh;
}

/** Сдвигаем весь сид (неделю) на ближайший рабочий день якоря demoDay. */
function alignDemoDay(db: DemoDb) {
  const target = nearestOpenDay();
  const from = db.demoDay;
  if (!from || from === target) return;

  const delta = differenceInCalendarDays(parseISO(target), parseISO(from));
  if (!delta) return;

  const shiftDate = (value: string | null | undefined) => {
    if (!value) return value;
    const day = value.slice(0, 10);
    const shifted = format(addDays(parseISO(day), delta), "yyyy-MM-dd");
    return `${shifted}${value.length > 10 ? value.slice(10) : ""}`;
  };

  db.demoDay = target;
  for (const apt of db.appointments) apt.date = shiftDate(apt.date) ?? apt.date;
  for (const period of db.diagnosticPeriods) {
    period.startDate = shiftDate(period.startDate) ?? period.startDate;
    period.endDate = shiftDate(period.endDate) ?? period.endDate;
    for (const interval of period.intervals) {
      interval.date = shiftDate(interval.date) ?? interval.date;
    }
  }
  for (const absence of db.absences) {
    absence.startDate = shiftDate(absence.startDate) ?? absence.startDate;
    absence.endDate = shiftDate(absence.endDate) ?? absence.endDate;
  }
  for (const course of db.clientCourses) {
    course.startedAt = shiftDate(course.startedAt) ?? course.startedAt;
    if (course.completedAt) course.completedAt = shiftDate(course.completedAt) ?? course.completedAt;
  }
  saveDb(db);
}

function ensureDiagnosticService(db: DemoDb) {
  if (db.services.some((s) => s.name === "Диагностика" && !s.isGroup)) return;
  db.services.push({
    id: newId("svc"),
    name: "Диагностика",
    durationMin: 30,
    color: "#5f6f58",
    isGroup: false,
    isActive: true,
  });
  saveDb(db);
}

export function saveDb(db: DemoDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDb() {
  localStorage.removeItem(DB_KEY);
  return loadDb();
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
