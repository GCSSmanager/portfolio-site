import type { UserRole } from "../lib/roles";

/** Тестовые учётки демо — держим рядом с сидом, чтобы логин и seed не разъезжались. */
export const DEMO_ACCOUNTS: Array<{
  username: string;
  password: string;
  role: UserRole;
  label: string;
}> = [
  { username: "admin", password: "admin", role: "DIRECTOR", label: "Администратор" },
  { username: "manager", password: "manager", role: "ADMIN", label: "Менеджер" },
  { username: "kovaleva", password: "demo", role: "SPECIALIST", label: "Ковалева А." },
  { username: "fedulova", password: "demo", role: "SPECIALIST", label: "Федулова М." },
];
