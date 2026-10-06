import type { UserRole } from "../../lib/roles";

export type NavItem = {
  to: string;
  label: string;
  end: boolean;
  roles: UserRole[];
};

export const NAV: NavItem[] = [
  { to: "/", label: "Расписание", end: true, roles: ["DIRECTOR", "ADMIN", "SPECIALIST"] },
  { to: "/client-schedule", label: "Клиент", end: false, roles: ["DIRECTOR", "ADMIN"] },
  { to: "/analytics", label: "Аналитика", end: false, roles: ["DIRECTOR", "ADMIN"] },
  { to: "/diagnostics", label: "Диагностика", end: false, roles: ["DIRECTOR", "ADMIN"] },
  { to: "/document-route", label: "Маршрутизация", end: false, roles: ["DIRECTOR", "ADMIN", "SPECIALIST"] },
  { to: "/documents", label: "Документы", end: false, roles: ["DIRECTOR", "ADMIN"] },
  { to: "/directories", label: "Справочники", end: false, roles: ["DIRECTOR", "ADMIN"] },
  { to: "/users", label: "Пользователи", end: false, roles: ["DIRECTOR"] },
  { to: "/clinic-hours", label: "Время клиники", end: false, roles: ["DIRECTOR"] },
  { to: "/profile", label: "Профиль", end: false, roles: ["DIRECTOR", "ADMIN", "SPECIALIST"] },
];
